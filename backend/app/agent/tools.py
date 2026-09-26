"""Client-side function tools for the Voice Agent API.

Tools are revealed in phases: a tool that isn't in the agent's current list can't be called, so the
agent physically cannot post a receipt before the worker has heard the read-back.
"""

import logging
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from enum import StrEnum
from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings
from app.db.models import ToolCall
from app.domain.enums import DraftState
from app.domain.errors import DomainError
from app.schemas import DraftView
from app.services.notifications import VendorNotifier
from app.services.receiving import ReceivingService

log = logging.getLogger(__name__)

JSON = dict[str, Any]


class Phase(StrEnum):
    IDENTIFY = "identify"
    COUNTING = "counting"
    CONFIRMING = "confirming"
    POSTED = "posted"


OPEN_PO: JSON = {
    "type": "function",
    "name": "open_purchase_order",
    "description": (
        "Open a purchase order for receiving. Call this as soon as the worker says which PO they "
        "are receiving, and again if they switch to a different PO."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "po_number": {
                "type": "string",
                "description": "The PO number as digits. Drop the 'PO' prefix.",
                "pattern": " *([0-9] *){3,8}",
                "examples": ["4582", "4 5 8 2"],
            },
            "vendor_name": {
                "type": "string",
                "description": "Vendor name if the worker said one; used to double-check the PO.",
                "examples": ["ABC Electronics"],
            },
        },
        "required": ["po_number"],
    },
}

RECORD_QUANTITIES: JSON = {
    "type": "function",
    "name": "record_received_quantities",
    "description": (
        "Record how many units of each item physically arrived. Call this whenever the worker "
        "states or corrects counts. Include every item from the utterance in one call, using the "
        "final number after any self-correction. A new count replaces the previous one."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "counts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "item": {
                            "type": "string",
                            "description": "Item as the worker said it.",
                            "examples": ["controllers", "power modules"],
                        },
                        "quantity": {
                            "type": "integer",
                            "minimum": 0,
                            "description": "Units received. 0 if none arrived.",
                            "examples": [80, 18],
                        },
                    },
                    "required": ["item", "quantity"],
                },
            },
        },
        "required": ["counts"],
    },
}

RECORD_DAMAGE: JSON = {
    "type": "function",
    "name": "record_damage",
    "description": (
        "Record units that arrived damaged (cracked, crushed, wet, dented, broken). Call this "
        "whenever the worker mentions damage. Damaged units are part of what arrived, so the "
        "item needs a count first. A new damaged count replaces the previous one; 0 clears it."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "item": {
                "type": "string",
                "description": "Item as the worker said it.",
                "examples": ["sensors", "stretch wrap"],
            },
            "quantity": {
                "type": "integer",
                "minimum": 0,
                "description": "How many of the arrived units are damaged.",
                "examples": [3, 1],
            },
            "note": {
                "type": "string",
                "description": "Short description of the damage in the worker's words.",
                "examples": ["cracked housing", "carton wet"],
            },
        },
        "required": ["item", "quantity"],
    },
}

REVIEW: JSON = {
    "type": "function",
    "name": "review_receipt",
    "description": (
        "Get the totals to read back before posting. Call this once every line has a count, and "
        "again after any correction. Read the result to the worker and ask them to confirm."
    ),
    "parameters": {"type": "object", "properties": {}},
}

POST: JSON = {
    "type": "function",
    "name": "post_goods_receipt",
    "description": (
        "Post the goods receipt to the ERP: creates the GRN, updates inventory and logs "
        "discrepancies. Only call this after the worker clearly confirmed the latest read-back."
    ),
    "parameters": {"type": "object", "properties": {}},
}

CANCEL: JSON = {
    "type": "function",
    "name": "cancel_receipt",
    "description": (
        "Discard the receipt in progress. Only when the worker asks to cancel or start over."
    ),
    "parameters": {"type": "object", "properties": {}},
}

NOTIFY_VENDOR: JSON = {
    "type": "function",
    "name": "notify_vendor",
    "description": (
        "Email the vendor about the discrepancies on the receipt that was just posted. Call this "
        "only when the worker asks to notify or tell the vendor."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "message": {
                "type": "string",
                "description": "The worker's request in one polite sentence to the vendor.",
                "examples": ["Please ship the missing controllers."],
            },
            "due_date": {
                "type": "string",
                "format": "date",
                "description": "ISO date the vendor should resolve it by, if the worker gave one.",
                "examples": ["2026-10-02"],
            },
        },
        "required": ["message"],
    },
}

PHASE_TOOLS: dict[Phase, list[JSON]] = {
    Phase.IDENTIFY: [OPEN_PO],
    Phase.COUNTING: [OPEN_PO, RECORD_QUANTITIES, RECORD_DAMAGE, REVIEW, CANCEL],
    Phase.CONFIRMING: [OPEN_PO, RECORD_QUANTITIES, RECORD_DAMAGE, REVIEW, POST, CANCEL],
    Phase.POSTED: [OPEN_PO, NOTIFY_VENDOR],
}


@dataclass(frozen=True)
class ToolOutcome:
    ok: bool
    result: JSON
    phase: Phase
    draft: DraftView | None


Handler = Callable[[Session, Settings, str, JSON], JSON]


def _open_po(db: Session, _: Settings, session_id: str, args: JSON) -> JSON:
    svc = ReceivingService(db, session_id)
    view = svc.view(svc.open_po(str(args["po_number"]), args.get("vendor_name")))
    return {
        "po_number": view.po_number,
        "vendor": view.vendor_name,
        "lines": [
            {"item": line.name, "expected": line.expected_qty, "unit": line.unit}
            for line in view.lines
        ],
    }


def _record(db: Session, _: Settings, session_id: str, args: JSON) -> JSON:
    counts = args.get("counts") or []
    if not counts:
        raise DomainError("No counts were given. Ask the worker how many of each item arrived.")
    svc = ReceivingService(db, session_id)
    recorded, warnings = [], []
    for entry in counts:
        draft, change = svc.set_quantity(str(entry["item"]), int(entry["quantity"]))
        recorded.append(
            {"item": change.item, "quantity": change.current, "previous": change.previous}
        )
        if change.warning:
            warnings.append(change.warning)
    view = svc.view(draft)
    return {"recorded": recorded, "warnings": warnings, "still_needed": view.pending_items}


def _damage(db: Session, _: Settings, session_id: str, args: JSON) -> JSON:
    note = args.get("note")
    change = ReceivingService(db, session_id).record_damage(
        str(args["item"]), int(args["quantity"]), str(note) if note else None
    )[1]
    return {
        "item": change.item,
        "damaged": change.damaged,
        "good": change.good,
        "note": change.note,
        "next_step": "Damaged units go to quarantine when the receipt is posted.",
    }


def _review(db: Session, _: Settings, session_id: str, __: JSON) -> JSON:
    svc = ReceivingService(db, session_id)
    view = svc.view(svc.review())
    return {
        "po_number": view.po_number,
        "lines": [
            {
                "item": line.name,
                "expected": line.expected_qty,
                "arrived": line.received_qty,
                "damaged": line.damaged_qty,
                "good": (line.received_qty or 0) - line.damaged_qty,
            }
            for line in view.lines
        ],
        "damaged": [
            {"item": line.name, "quantity": line.damaged_qty, "note": line.damage_note}
            for line in view.lines
            if line.damaged_qty
        ],
        "shortages": [
            {"item": line.name, "quantity": -(line.variance or 0)}
            for line in view.lines
            if line.status == "short"
        ],
        "over_receipts": [
            {"item": line.name, "quantity": line.variance}
            for line in view.lines
            if line.status == "over"
        ],
        "next_step": "Read these totals back and ask the worker to confirm before posting.",
    }


def _post(db: Session, _: Settings, session_id: str, __: JSON) -> JSON:
    result = ReceivingService(db, session_id).post()
    return {
        "grn_number": result.grn_number,
        "po_number": result.po_number,
        "po_status": result.po_status.value,
        "units_received": result.units_received,
        "units_quarantined": result.units_quarantined,
        "discrepancies": [
            {"item": d.item, "type": d.type.value, "quantity": d.quantity, "note": d.note}
            for d in result.discrepancies
        ],
    }


def _cancel(db: Session, _: Settings, session_id: str, __: JSON) -> JSON:
    svc = ReceivingService(db, session_id)
    return {"cancelled": svc.view(svc.cancel()).po_number}


def _notify(db: Session, settings: Settings, session_id: str, args: JSON) -> JSON:
    due_raw = args.get("due_date")
    try:
        due = date.fromisoformat(due_raw) if due_raw else None
    except ValueError as exc:
        raise DomainError(f"'{due_raw}' is not a date. Ask the worker for the due date.") from exc
    message = VendorNotifier(db, settings).notify_latest_receipt(
        session_id, str(args["message"]), due
    )
    return {
        "vendor": message.vendor.name,
        "status": message.status.value,
        "due_date": message.due_date.isoformat() if message.due_date else None,
    }


HANDLERS: dict[str, Handler] = {
    "open_purchase_order": _open_po,
    "record_received_quantities": _record,
    "record_damage": _damage,
    "review_receipt": _review,
    "post_goods_receipt": _post,
    "cancel_receipt": _cancel,
    "notify_vendor": _notify,
}


def run_tool(
    db: Session, settings: Settings, session_id: str, name: str, args: JSON
) -> ToolOutcome:
    """Execute one tool call atomically and record it in the audit trail."""
    handler = HANDLERS.get(name)
    started = time.perf_counter()
    try:
        if handler is None:
            raise DomainError(f"Unknown tool {name}.")
        result = handler(db, settings, session_id, args)
        ok = True
        db.commit()
    except DomainError as exc:
        db.rollback()
        result, ok = {"error": str(exc)}, False
    except Exception:
        db.rollback()
        log.exception("Tool %s failed", name)
        result, ok = (
            {"error": "The ERP had a problem. Tell the worker to try again in a moment."},
            False,
        )

    db.add(
        ToolCall(
            session_id=session_id,
            name=name,
            arguments=args,
            result=result,
            ok=ok,
            duration_ms=round((time.perf_counter() - started) * 1000),
        )
    )
    db.commit()

    svc = ReceivingService(db, session_id)
    draft = svc.current()
    return ToolOutcome(
        ok=ok,
        result=result,
        phase=phase_for(draft.state if draft else None),
        draft=svc.view(draft) if draft else None,
    )


def phase_for(state: DraftState | None) -> Phase:
    match state:
        case DraftState.DRAFT:
            return Phase.COUNTING
        case DraftState.AWAITING_CONFIRMATION:
            return Phase.CONFIRMING
        case DraftState.POSTED:
            return Phase.POSTED
        case _:
            return Phase.IDENTIFY
