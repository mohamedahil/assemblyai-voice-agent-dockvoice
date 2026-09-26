from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DB
from app.db.models import (
    Discrepancy,
    GoodsReceipt,
    InventoryMovement,
    Item,
    POLine,
    PurchaseOrder,
    VendorMessage,
)
from app.domain.enums import DiscrepancyStatus, POStatus
from app.schemas import (
    DiscrepancyOut,
    GRNDetail,
    GRNSummary,
    ItemOut,
    MovementOut,
    PODetail,
    POSummary,
    VendorMessageOut,
)
from app.services.views import (
    discrepancy_out,
    grn_detail,
    grn_summary,
    message_out,
    po_detail,
    po_summary,
)

router = APIRouter(tags=["erp"])

_po_options = (
    selectinload(PurchaseOrder.vendor),
    selectinload(PurchaseOrder.lines).selectinload(POLine.item),
)
_grn_options = (
    selectinload(GoodsReceipt.lines),
    selectinload(GoodsReceipt.discrepancies),
    selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.vendor),
)


@router.get("/purchase-orders")
def list_purchase_orders(db: DB, status: POStatus | None = None) -> list[POSummary]:
    query = select(PurchaseOrder).options(*_po_options).order_by(PurchaseOrder.number.desc())
    if status is not None:
        query = query.where(PurchaseOrder.status == status)
    return [po_summary(po) for po in db.scalars(query).all()]


@router.get("/purchase-orders/{number}")
def get_purchase_order(number: str, db: DB) -> PODetail:
    po = db.scalars(
        select(PurchaseOrder).options(*_po_options).where(PurchaseOrder.number == number.upper())
    ).first()
    if po is None:
        raise HTTPException(status_code=404, detail=f"{number} not found")
    receipts = db.scalars(
        select(GoodsReceipt)
        .options(*_grn_options)
        .where(GoodsReceipt.po_id == po.id)
        .order_by(GoodsReceipt.received_at.desc())
    ).all()
    return po_detail(po, list(receipts))


@router.get("/receipts")
def list_receipts(db: DB, limit: int = Query(100, le=500)) -> list[GRNSummary]:
    receipts = db.scalars(
        select(GoodsReceipt)
        .options(*_grn_options)
        .order_by(GoodsReceipt.received_at.desc())
        .limit(limit)
    ).all()
    return [grn_summary(grn) for grn in receipts]


@router.get("/receipts/{number}")
def get_receipt(number: str, db: DB) -> GRNDetail:
    grn = db.scalars(
        select(GoodsReceipt).options(*_grn_options).where(GoodsReceipt.number == number.upper())
    ).first()
    if grn is None:
        raise HTTPException(status_code=404, detail=f"{number} not found")
    return grn_detail(grn)


@router.get("/discrepancies")
def list_discrepancies(db: DB, status: DiscrepancyStatus | None = None) -> list[DiscrepancyOut]:
    query = select(Discrepancy).order_by(Discrepancy.created_at.desc())
    if status is not None:
        query = query.where(Discrepancy.status == status)
    return [discrepancy_out(d) for d in db.scalars(query).all()]


@router.get("/inventory/items")
def list_items(db: DB) -> list[ItemOut]:
    return [ItemOut.model_validate(i) for i in db.scalars(select(Item).order_by(Item.sku)).all()]


@router.get("/inventory/movements")
def list_movements(db: DB, limit: int = Query(50, le=500)) -> list[MovementOut]:
    movements = db.scalars(
        select(InventoryMovement)
        .options(selectinload(InventoryMovement.item))
        .order_by(InventoryMovement.created_at.desc(), InventoryMovement.id.desc())
        .limit(limit)
    ).all()
    return [MovementOut.model_validate(m) for m in movements]


@router.get("/vendor-messages")
def list_vendor_messages(db: DB) -> list[VendorMessageOut]:
    messages = db.scalars(select(VendorMessage).order_by(VendorMessage.created_at.desc())).all()
    return [message_out(m) for m in messages]
