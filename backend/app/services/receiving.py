"""Spoken goods receiving.

The agent never writes to the ERP directly. It edits a per-session draft; posting is only allowed
after the worker has heard the exact draft version read back and confirmed it.

    open_po ──► DRAFT ──set_quantity / record_damage──► DRAFT ──review──► AWAITING_CONFIRMATION
                  ▲                                                                 │
                  └──────────── any change after the read-back ◄────────────────────┤
                                                                                    ▼
                                                                         post ──► POSTED

Damaged units are part of what arrived: good units go into stock, damaged units into quarantine,
and the PO line stays open for the damaged quantity so the replacement can be received later.
"""

import re
from dataclasses import dataclass
from typing import Any

from rapidfuzz import fuzz, process, utils
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.base import utcnow
from app.db.models import (
    Discrepancy,
    GoodsReceipt,
    GRNLine,
    InventoryMovement,
    POLine,
    PurchaseOrder,
    ReceiptDraft,
)
from app.domain.enums import DiscrepancyType, DraftState, MovementType, POStatus
from app.domain.errors import DomainError, NotFoundError
from app.schemas import DraftLine, DraftView, LineStatus

MAX_QUANTITY = 100_000
ITEM_MATCH_THRESHOLD = 70
VENDOR_MATCH_THRESHOLD = 60
# Quantities this far above what's outstanding are probably mis-heard ("eighty" vs "eighteen").
SUSPICIOUS_OVER_RATIO = 1.5

ACTIVE_STATES = (DraftState.DRAFT, DraftState.AWAITING_CONFIRMATION)


@dataclass(frozen=True)
class QuantityChange:
    item: str
    previous: int | None
    current: int
    warning: str | None


@dataclass(frozen=True)
class DamageChange:
    item: str
    damaged: int
    good: int
    note: str | None


@dataclass(frozen=True)
class PostedDiscrepancy:
    item: str
    type: DiscrepancyType
    quantity: int
    note: str | None = None


@dataclass(frozen=True)
class PostResult:
    grn_number: str
    po_number: str
    vendor_name: str
    units_received: int
    units_quarantined: int
    discrepancies: list[PostedDiscrepancy]
    po_status: POStatus


def normalize_po_number(spoken: str) -> str:
    """'four five eight two' arrives as digits from the agent; tolerate 'PO 45 82' and similar."""
    digits = re.sub(r"\D", "", spoken)
    if not digits:
        raise DomainError(
            f"'{spoken}' is not a PO number. Ask the worker to read the PO number again."
        )
    return f"PO-{digits}"


class ReceivingService:
    def __init__(self, db: Session, session_id: str) -> None:
        self.db = db
        self.session_id = session_id

    # ---- Queries -------------------------------------------------------------------------------

    def current(self) -> ReceiptDraft | None:
        return self.db.scalars(
            select(ReceiptDraft)
            .where(ReceiptDraft.session_id == self.session_id)
            .order_by(ReceiptDraft.id.desc())
            .limit(1)
        ).first()

    def view(self, draft: ReceiptDraft) -> DraftView:
        po = draft.purchase_order
        lines = [
            _draft_line(line, draft.quantities.get(str(line.id)), draft.damages.get(str(line.id)))
            for line in po.lines
        ]
        grn_number = None
        if draft.grn_id is not None:
            grn = self.db.get(GoodsReceipt, draft.grn_id)
            grn_number = grn.number if grn else None
        return DraftView(
            draft_id=draft.id,
            session_id=draft.session_id,
            po_number=po.number,
            vendor_name=po.vendor.name,
            state=draft.state,
            version=draft.version,
            lines=lines,
            pending_items=[line.name for line in lines if line.status == "pending"],
            grn_number=grn_number,
            updated_at=draft.updated_at,
        )

    # ---- Commands ------------------------------------------------------------------------------

    def open_po(self, po_number: str, vendor_name: str | None = None) -> ReceiptDraft:
        number = normalize_po_number(po_number)
        po = (
            self.db.scalars(
                select(PurchaseOrder)
                .options(joinedload(PurchaseOrder.vendor), joinedload(PurchaseOrder.lines))
                .where(PurchaseOrder.number == number)
            )
            .unique()
            .first()
        )
        if po is None:
            raise NotFoundError(
                f"There is no purchase order {number}. Ask the worker to read the PO number again."
            )
        if po.status in (POStatus.RECEIVED, POStatus.CLOSED):
            raise DomainError(
                f"{number} is already fully received. Ask which PO they are receiving."
            )
        if vendor_name and _similarity(vendor_name, po.vendor.name) < VENDOR_MATCH_THRESHOLD:
            raise DomainError(
                f"{number} is from {po.vendor.name}, not {vendor_name}. "
                "Ask the worker to check the PO number or the vendor on the packing slip."
            )

        active = self._active_draft()
        if active is not None:
            if active.po_id == po.id:
                return active
            active.state = DraftState.CANCELLED

        draft = ReceiptDraft(
            session_id=self.session_id, po_id=po.id, quantities={}, damages={}, version=0
        )
        self.db.add(draft)
        self.db.flush()
        return draft

    def set_quantity(self, item: str, quantity: int) -> tuple[ReceiptDraft, QuantityChange]:
        draft = self._require_active_draft()
        if not 0 <= quantity <= MAX_QUANTITY:
            raise DomainError(
                f"{quantity} is not a valid quantity for {item}. Ask for the count again."
            )

        line = self._match_line(draft, item)
        key = str(line.id)
        damaged = _damaged(draft, key)
        if quantity < damaged:
            raise DomainError(
                f"{damaged} {line.item.name} were reported damaged, but only {quantity} arrived. "
                "Ask the worker to confirm how many arrived in total, including damaged ones."
            )
        previous = draft.quantities.get(key)
        # Reassign (not mutate) so SQLAlchemy detects the JSON change.
        draft.quantities = {**draft.quantities, key: quantity}
        self._touch(draft)

        return draft, QuantityChange(
            item=line.item.name,
            previous=previous,
            current=quantity,
            warning=_quantity_warning(line, quantity),
        )

    def record_damage(
        self, item: str, quantity: int, note: str | None = None
    ) -> tuple[ReceiptDraft, DamageChange]:
        draft = self._require_active_draft()
        line = self._match_line(draft, item)
        key = str(line.id)
        arrived = draft.quantities.get(key)
        if arrived is None:
            raise DomainError(
                f"No count yet for {line.item.name}. Damaged units are part of what arrived, so "
                "ask how many arrived in total first, then record the damage."
            )
        if not 0 <= quantity <= arrived:
            raise DomainError(
                f"{quantity} damaged is more than the {arrived} {line.item.name} that arrived. "
                "Ask the worker for the damaged count again."
            )

        note = (note or "").strip() or None
        damages = {k: v for k, v in draft.damages.items() if k != key}
        if quantity:
            damages[key] = {"quantity": quantity, "note": note}
        draft.damages = damages
        self._touch(draft)

        return draft, DamageChange(
            item=line.item.name, damaged=quantity, good=arrived - quantity, note=note
        )

    def review(self) -> ReceiptDraft:
        draft = self._require_active_draft()
        view = self.view(draft)
        if view.pending_items:
            counted = [line.name for line in view.lines if line.status != "pending"]
            raise DomainError(
                f"Still need a count for: {', '.join(view.pending_items)}. "
                + (f"Already counted: {', '.join(counted)}. " if counted else "")
                + "Ask the worker for the missing counts. If nothing arrived, record zero."
            )
        draft.state = DraftState.AWAITING_CONFIRMATION
        draft.reviewed_version = draft.version
        self.db.flush()
        return draft

    def post(self) -> PostResult:
        draft = self._require_active_draft()
        if (
            draft.state != DraftState.AWAITING_CONFIRMATION
            or draft.reviewed_version != draft.version
        ):
            raise DomainError(
                "The worker has not confirmed the latest counts. Call review_receipt, read the "
                "totals back, and only post after they say yes."
            )

        po = draft.purchase_order
        grn = GoodsReceipt(
            number=self._next_grn_number(),
            po_id=po.id,
            source="voice",
            session_id=self.session_id,
            received_at=utcnow(),
        )
        self.db.add(grn)
        self.db.flush()

        discrepancies: list[PostedDiscrepancy] = []
        units = quarantined = 0
        for line in po.lines:
            key = str(line.id)
            received = draft.quantities[key]
            damage = draft.damages.get(key) or {}
            damaged = int(damage.get("quantity", 0))
            note = damage.get("note")
            good = received - damaged
            expected = line.outstanding_qty
            item = line.item
            units += good
            quarantined += damaged

            grn.lines.append(
                GRNLine(
                    po_line_id=line.id,
                    item_id=line.item_id,
                    expected_qty=expected,
                    received_qty=received,
                    damaged_qty=damaged,
                    damage_note=note,
                )
            )
            # Only good units count against the PO; damaged ones stay open for the replacement.
            line.received_qty += good
            item.on_hand += good
            item.quarantined += damaged
            if good:
                self._add_movement(item.id, MovementType.RECEIPT, good, item.on_hand, grn.number)
            if damaged:
                self._add_movement(
                    item.id, MovementType.QUARANTINE, damaged, item.quarantined, grn.number
                )

            line_discrepancies: list[PostedDiscrepancy] = []
            variance = received - expected
            if variance:
                kind = DiscrepancyType.OVER_RECEIPT if variance > 0 else DiscrepancyType.SHORTAGE
                line_discrepancies.append(PostedDiscrepancy(item.name, kind, abs(variance)))
            if damaged:
                line_discrepancies.append(
                    PostedDiscrepancy(item.name, DiscrepancyType.DAMAGED, damaged, note)
                )
            for posted in line_discrepancies:
                self.db.add(
                    Discrepancy(
                        grn_id=grn.id,
                        po_id=po.id,
                        item_id=item.id,
                        type=posted.type,
                        quantity=posted.quantity,
                        value=round(posted.quantity * item.unit_cost, 2),
                        note=posted.note,
                    )
                )
            discrepancies.extend(line_discrepancies)

        po.status = (
            POStatus.RECEIVED
            if all(line.received_qty >= line.ordered_qty for line in po.lines)
            else POStatus.PARTIALLY_RECEIVED
        )
        draft.state = DraftState.POSTED
        draft.grn_id = grn.id
        self.db.flush()

        return PostResult(
            grn_number=grn.number,
            po_number=po.number,
            vendor_name=po.vendor.name,
            units_received=units,
            units_quarantined=quarantined,
            discrepancies=discrepancies,
            po_status=po.status,
        )

    def cancel(self) -> ReceiptDraft:
        draft = self._require_active_draft()
        draft.state = DraftState.CANCELLED
        self.db.flush()
        return draft

    # ---- Internals -----------------------------------------------------------------------------

    def _touch(self, draft: ReceiptDraft) -> None:
        draft.version += 1
        if draft.state == DraftState.AWAITING_CONFIRMATION:
            # Anything the worker confirmed is now stale; they must hear the new totals.
            draft.state = DraftState.DRAFT
            draft.reviewed_version = None
        self.db.flush()

    def _add_movement(
        self, item_id: int, kind: MovementType, quantity: int, after: int, reference: str
    ) -> None:
        self.db.add(
            InventoryMovement(
                item_id=item_id,
                type=kind,
                quantity=quantity,
                on_hand_after=after,
                reference=reference,
            )
        )

    def _active_draft(self) -> ReceiptDraft | None:
        draft = self.current()
        return draft if draft is not None and draft.state in ACTIVE_STATES else None

    def _require_active_draft(self) -> ReceiptDraft:
        draft = self._active_draft()
        if draft is None:
            raise DomainError("No receipt is open. Ask the worker which PO they are receiving.")
        return draft

    def _match_line(self, draft: ReceiptDraft, spoken: str) -> POLine:
        lines = draft.purchase_order.lines
        choices: dict[str, POLine] = {}
        for line in lines:
            for label in (line.item.name, line.item.sku, *line.item.aliases):
                choices[label] = line

        ranked = process.extract(
            spoken, list(choices), scorer=fuzz.WRatio, processor=utils.default_process, limit=None
        )
        best_per_line: dict[int, float] = {}
        for label, score, _ in ranked:
            line_id = choices[label].id
            best_per_line[line_id] = max(best_per_line.get(line_id, 0.0), score)

        ordered = sorted(best_per_line.items(), key=lambda kv: kv[1], reverse=True)
        names = ", ".join(line.item.name for line in lines)
        if not ordered or ordered[0][1] < ITEM_MATCH_THRESHOLD:
            raise DomainError(
                f"'{spoken}' is not on {draft.purchase_order.number}. The lines are: {names}. "
                "Ask the worker which item they meant."
            )
        if len(ordered) > 1 and ordered[0][1] - ordered[1][1] < 3 and ordered[1][1] >= 90:
            first, second = (next(li for li in lines if li.id == lid) for lid, _ in ordered[:2])
            raise DomainError(
                f"'{spoken}' could be {first.item.name} or {second.item.name}. Ask which one."
            )
        return next(line for line in lines if line.id == ordered[0][0])

    def _next_grn_number(self) -> str:
        numbers = self.db.scalars(select(GoodsReceipt.number)).all()
        highest = max((int(n.split("-")[1]) for n in numbers), default=1000)
        return f"GRN-{highest + 1}"


def _damaged(draft: ReceiptDraft, key: str) -> int:
    return int((draft.damages.get(key) or {}).get("quantity", 0))


def _draft_line(line: POLine, received: int | None, damage: dict[str, Any] | None) -> DraftLine:
    expected = line.outstanding_qty
    variance = None if received is None else received - expected
    status: LineStatus
    if variance is None:
        status = "pending"
    elif variance == 0:
        status = "match"
    else:
        status = "short" if variance < 0 else "over"
    return DraftLine(
        po_line_id=line.id,
        line_no=line.line_no,
        sku=line.item.sku,
        name=line.item.name,
        unit=line.item.unit,
        expected_qty=expected,
        received_qty=received,
        damaged_qty=int((damage or {}).get("quantity", 0)),
        damage_note=(damage or {}).get("note"),
        variance=variance,
        status=status,
    )


def _quantity_warning(line: POLine, quantity: int) -> str | None:
    expected = line.outstanding_qty
    if expected and quantity > expected * SUSPICIOUS_OVER_RATIO:
        return (
            f"{quantity} is far above the {expected} outstanding for {line.item.name}. "
            "Double-check this number with the worker before moving on."
        )
    if quantity > expected:
        return f"Over-receipt: {quantity - expected} more {line.item.name} than outstanding."
    return None


def _similarity(a: str, b: str) -> float:
    return float(fuzz.WRatio(a, b, processor=utils.default_process))
