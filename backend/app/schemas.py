"""Response models shared by the REST API and the agent tools."""

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, PlainSerializer

from app.domain.enums import (
    DiscrepancyStatus,
    DiscrepancyType,
    DraftState,
    MessageStatus,
    MovementType,
    POStatus,
)

# Timestamps are stored as naive UTC; make that explicit on the wire.
UTCDatetime = Annotated[datetime, PlainSerializer(lambda v: v.isoformat() + "Z", return_type=str)]


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- Master data -------------------------------------------------------------------------------


class VendorOut(Schema):
    id: int
    code: str
    name: str
    email: str
    contact_name: str
    city: str


class ItemOut(Schema):
    id: int
    sku: str
    name: str
    category: str
    unit: str
    unit_cost: float
    on_hand: int
    quarantined: int
    reorder_point: int
    bin_location: str


# ---- Purchasing --------------------------------------------------------------------------------


class POLineOut(Schema):
    id: int
    line_no: int
    item: ItemOut
    ordered_qty: int
    received_qty: int
    outstanding_qty: int


class POSummary(Schema):
    id: int
    number: str
    vendor: VendorOut
    status: POStatus
    order_date: date
    expected_date: date
    total_value: float
    line_count: int
    received_pct: float


class PODetail(POSummary):
    lines: list[POLineOut]
    receipts: list["GRNSummary"]


# ---- Receiving draft (the live voice state) ----------------------------------------------------

LineStatus = Literal["pending", "match", "short", "over"]


class DraftLine(Schema):
    po_line_id: int
    line_no: int
    sku: str
    name: str
    unit: str
    expected_qty: int
    received_qty: int | None
    damaged_qty: int
    damage_note: str | None
    variance: int | None
    status: LineStatus


class DraftView(Schema):
    draft_id: int
    session_id: str
    po_number: str
    vendor_name: str
    state: DraftState
    version: int
    lines: list[DraftLine]
    pending_items: list[str]
    grn_number: str | None
    updated_at: UTCDatetime


# ---- Goods receipts & discrepancies ------------------------------------------------------------


class GRNLineOut(Schema):
    id: int
    item: ItemOut
    expected_qty: int
    received_qty: int
    damaged_qty: int
    damage_note: str | None


class DiscrepancyOut(Schema):
    id: int
    type: DiscrepancyType
    quantity: int
    value: float
    note: str | None
    status: DiscrepancyStatus
    created_at: UTCDatetime
    item: ItemOut
    po_number: str
    grn_number: str
    vendor_name: str


class GRNSummary(Schema):
    id: int
    number: str
    po_number: str
    vendor_name: str
    source: str
    received_at: UTCDatetime
    total_units: int
    discrepancy_count: int


class GRNDetail(GRNSummary):
    lines: list[GRNLineOut]
    discrepancies: list[DiscrepancyOut]


# ---- Inventory ---------------------------------------------------------------------------------


class MovementOut(Schema):
    id: int
    item: ItemOut
    type: MovementType
    quantity: int
    on_hand_after: int
    reference: str
    created_at: UTCDatetime


# ---- Vendor communication ----------------------------------------------------------------------


class VendorMessageOut(Schema):
    id: int
    vendor: VendorOut
    po_number: str
    to_email: str
    subject: str
    body_text: str
    body_html: str
    due_date: date | None
    status: MessageStatus
    error: str | None
    created_at: UTCDatetime


# ---- Activity & dashboard ----------------------------------------------------------------------


class ToolCallOut(Schema):
    id: int
    session_id: str
    name: str
    arguments: dict[str, object]
    result: dict[str, object]
    ok: bool
    duration_ms: int
    created_at: UTCDatetime


class DailyReceipts(Schema):
    day: date
    receipts: int
    units: int


class VendorPerformance(Schema):
    vendor_name: str
    receipts: int
    fill_rate: float
    shortage_value: float


class DashboardOut(Schema):
    receipts_today: int
    units_today: int
    open_pos: int
    open_discrepancies: int
    open_shortage_value: float
    fill_rate: float
    inventory_value: float
    low_stock_items: int
    daily: list[DailyReceipts]
    vendors: list[VendorPerformance]
    recent_receipts: list[GRNSummary]


PODetail.model_rebuild()
