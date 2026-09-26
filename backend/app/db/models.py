from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow
from app.domain.enums import (
    DiscrepancyStatus,
    DiscrepancyType,
    DraftState,
    MessageStatus,
    MovementType,
    POStatus,
)


def _enum(enum_cls: type) -> Enum:
    # Store enum values (not names) as plain strings; avoids native DB enum migrations.
    return Enum(enum_cls, native_enum=False, values_callable=lambda e: [m.value for m in e])


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200))
    contact_name: Mapped[str] = mapped_column(String(120))
    city: Mapped[str] = mapped_column(String(80))

    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(back_populates="vendor")


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(60))
    unit: Mapped[str] = mapped_column(String(20))
    unit_cost: Mapped[float]
    on_hand: Mapped[int] = mapped_column(default=0)
    # Damaged units held back from sellable stock until replaced or written off.
    quarantined: Mapped[int] = mapped_column(default=0)
    reorder_point: Mapped[int] = mapped_column(default=0)
    bin_location: Mapped[str] = mapped_column(String(20))
    # Spoken synonyms, e.g. "power mods" for "Power Module 24V".
    aliases: Mapped[list[str]] = mapped_column(JSON, default=list)


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(20), unique=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"))
    status: Mapped[POStatus] = mapped_column(_enum(POStatus), default=POStatus.OPEN)
    order_date: Mapped[date] = mapped_column(Date)
    expected_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    vendor: Mapped[Vendor] = relationship(back_populates="purchase_orders")
    lines: Mapped[list["POLine"]] = relationship(
        back_populates="purchase_order", order_by="POLine.line_no", cascade="all, delete-orphan"
    )


class POLine(Base):
    __tablename__ = "po_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    line_no: Mapped[int]
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"))
    ordered_qty: Mapped[int]
    received_qty: Mapped[int] = mapped_column(default=0)

    purchase_order: Mapped[PurchaseOrder] = relationship(back_populates="lines")
    item: Mapped[Item] = relationship()

    @property
    def outstanding_qty(self) -> int:
        return max(self.ordered_qty - self.received_qty, 0)


class ReceiptDraft(Base):
    """In-progress spoken receipt, one per voice session and PO."""

    __tablename__ = "receipt_drafts"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    state: Mapped[DraftState] = mapped_column(_enum(DraftState), default=DraftState.DRAFT)
    # {str(po_line_id): received_qty}. Corrections overwrite; they never accumulate.
    quantities: Mapped[dict[str, int]] = mapped_column(JSON, default=dict)
    # {str(po_line_id): {"quantity": int, "note": str}}. Damaged units are part of what arrived.
    damages: Mapped[dict[str, dict[str, Any]]] = mapped_column(JSON, default=dict)
    # Bumped on every change; posting requires the version the worker heard read back.
    version: Mapped[int] = mapped_column(default=0)
    reviewed_version: Mapped[int | None]
    grn_id: Mapped[int | None] = mapped_column(ForeignKey("goods_receipts.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    purchase_order: Mapped[PurchaseOrder] = relationship()


class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(20), unique=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    source: Mapped[str] = mapped_column(String(20), default="voice")
    session_id: Mapped[str | None] = mapped_column(String(64))
    received_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    purchase_order: Mapped[PurchaseOrder] = relationship()
    lines: Mapped[list["GRNLine"]] = relationship(
        back_populates="receipt", cascade="all, delete-orphan"
    )
    discrepancies: Mapped[list["Discrepancy"]] = relationship(back_populates="receipt")


class GRNLine(Base):
    __tablename__ = "grn_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    grn_id: Mapped[int] = mapped_column(ForeignKey("goods_receipts.id"))
    po_line_id: Mapped[int] = mapped_column(ForeignKey("po_lines.id"))
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"))
    expected_qty: Mapped[int]
    received_qty: Mapped[int]
    damaged_qty: Mapped[int] = mapped_column(default=0)
    damage_note: Mapped[str | None] = mapped_column(String(200))

    receipt: Mapped[GoodsReceipt] = relationship(back_populates="lines")
    item: Mapped[Item] = relationship()


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"))
    type: Mapped[MovementType] = mapped_column(_enum(MovementType))
    quantity: Mapped[int]
    on_hand_after: Mapped[int]
    reference: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    item: Mapped[Item] = relationship()


class Discrepancy(Base):
    __tablename__ = "discrepancies"

    id: Mapped[int] = mapped_column(primary_key=True)
    grn_id: Mapped[int] = mapped_column(ForeignKey("goods_receipts.id"))
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"))
    type: Mapped[DiscrepancyType] = mapped_column(_enum(DiscrepancyType))
    quantity: Mapped[int]
    value: Mapped[float]
    note: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[DiscrepancyStatus] = mapped_column(
        _enum(DiscrepancyStatus), default=DiscrepancyStatus.OPEN
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    receipt: Mapped[GoodsReceipt] = relationship(back_populates="discrepancies")
    purchase_order: Mapped[PurchaseOrder] = relationship()
    item: Mapped[Item] = relationship()


class VendorMessage(Base):
    __tablename__ = "vendor_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendors.id"))
    po_id: Mapped[int] = mapped_column(ForeignKey("purchase_orders.id"))
    to_email: Mapped[str] = mapped_column(String(200))
    subject: Mapped[str] = mapped_column(String(200))
    body_text: Mapped[str] = mapped_column(Text)
    body_html: Mapped[str] = mapped_column(Text)
    due_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[MessageStatus] = mapped_column(_enum(MessageStatus))
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    vendor: Mapped[Vendor] = relationship()
    purchase_order: Mapped[PurchaseOrder] = relationship()


class ToolCall(Base):
    """Audit trail of every action the voice agent took."""

    __tablename__ = "tool_calls"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(60))
    arguments: Mapped[dict[str, Any]] = mapped_column(JSON)
    result: Mapped[dict[str, Any]] = mapped_column(JSON)
    ok: Mapped[bool]
    duration_ms: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
