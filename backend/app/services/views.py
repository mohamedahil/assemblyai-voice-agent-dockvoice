"""ORM → response-model mappers for values that are derived rather than stored."""

from app.db.models import Discrepancy, GoodsReceipt, PurchaseOrder, VendorMessage
from app.schemas import (
    DiscrepancyOut,
    GRNDetail,
    GRNLineOut,
    GRNSummary,
    ItemOut,
    PODetail,
    POLineOut,
    POSummary,
    VendorMessageOut,
    VendorOut,
)


def po_summary(po: PurchaseOrder) -> POSummary:
    return POSummary(**_po_fields(po))


def po_detail(po: PurchaseOrder, receipts: list[GoodsReceipt]) -> PODetail:
    return PODetail(
        **_po_fields(po),
        lines=[POLineOut.model_validate(line) for line in po.lines],
        receipts=[grn_summary(grn) for grn in receipts],
    )


def _po_fields(po: PurchaseOrder) -> dict[str, object]:
    ordered = sum(line.ordered_qty for line in po.lines)
    received = sum(min(line.received_qty, line.ordered_qty) for line in po.lines)
    return {
        "id": po.id,
        "number": po.number,
        "vendor": VendorOut.model_validate(po.vendor),
        "status": po.status,
        "order_date": po.order_date,
        "expected_date": po.expected_date,
        "total_value": round(sum(line.ordered_qty * line.item.unit_cost for line in po.lines), 2),
        "line_count": len(po.lines),
        "received_pct": round(100 * received / ordered, 1) if ordered else 0.0,
    }


def grn_summary(grn: GoodsReceipt) -> GRNSummary:
    return GRNSummary(**_grn_fields(grn))


def grn_detail(grn: GoodsReceipt) -> GRNDetail:
    return GRNDetail(
        **_grn_fields(grn),
        lines=[GRNLineOut.model_validate(line) for line in grn.lines],
        discrepancies=[discrepancy_out(d) for d in grn.discrepancies],
    )


def _grn_fields(grn: GoodsReceipt) -> dict[str, object]:
    return {
        "id": grn.id,
        "number": grn.number,
        "po_number": grn.purchase_order.number,
        "vendor_name": grn.purchase_order.vendor.name,
        "source": grn.source,
        "received_at": grn.received_at,
        "total_units": sum(line.received_qty for line in grn.lines),
        "discrepancy_count": len(grn.discrepancies),
    }


def discrepancy_out(d: Discrepancy) -> DiscrepancyOut:
    return DiscrepancyOut(
        id=d.id,
        type=d.type,
        quantity=d.quantity,
        value=d.value,
        note=d.note,
        status=d.status,
        created_at=d.created_at,
        item=ItemOut.model_validate(d.item),
        po_number=d.purchase_order.number,
        grn_number=d.receipt.number,
        vendor_name=d.purchase_order.vendor.name,
    )


def message_out(m: VendorMessage) -> VendorMessageOut:
    return VendorMessageOut(
        id=m.id,
        vendor=VendorOut.model_validate(m.vendor),
        po_number=m.purchase_order.number,
        to_email=m.to_email,
        subject=m.subject,
        body_text=m.body_text,
        body_html=m.body_html,
        due_date=m.due_date,
        status=m.status,
        error=m.error,
        created_at=m.created_at,
    )
