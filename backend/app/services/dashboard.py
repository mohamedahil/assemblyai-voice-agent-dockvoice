from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.base import utcnow
from app.db.models import Discrepancy, GoodsReceipt, Item, PurchaseOrder
from app.domain.enums import DiscrepancyStatus, DiscrepancyType, POStatus
from app.schemas import DailyReceipts, DashboardOut, VendorPerformance
from app.services.views import grn_summary

TREND_DAYS = 14


def build_dashboard(db: Session) -> DashboardOut:
    now = utcnow()
    today_start = datetime(now.year, now.month, now.day)
    trend_start = today_start - timedelta(days=TREND_DAYS - 1)

    receipts = db.scalars(
        select(GoodsReceipt)
        .options(
            selectinload(GoodsReceipt.lines),
            selectinload(GoodsReceipt.discrepancies),
            selectinload(GoodsReceipt.purchase_order).selectinload(PurchaseOrder.vendor),
        )
        .where(GoodsReceipt.received_at >= trend_start)
        .order_by(GoodsReceipt.received_at.desc())
    ).all()

    daily: dict[str, DailyReceipts] = {}
    for offset in range(TREND_DAYS):
        day = (trend_start + timedelta(days=offset)).date()
        daily[day.isoformat()] = DailyReceipts(day=day, receipts=0, units=0)

    expected_total = received_total = 0
    vendor_stats: dict[str, dict[str, float]] = defaultdict(
        lambda: {"receipts": 0, "expected": 0, "received": 0, "shortage_value": 0.0}
    )
    for grn in receipts:
        bucket = daily[grn.received_at.date().isoformat()]
        units = sum(line.received_qty for line in grn.lines)
        bucket.receipts += 1
        bucket.units += units

        expected = sum(line.expected_qty for line in grn.lines)
        received = sum(min(line.received_qty, line.expected_qty) for line in grn.lines)
        expected_total += expected
        received_total += received

        stats = vendor_stats[grn.purchase_order.vendor.name]
        stats["receipts"] += 1
        stats["expected"] += expected
        stats["received"] += received
        stats["shortage_value"] += sum(
            d.value for d in grn.discrepancies if d.type == DiscrepancyType.SHORTAGE
        )

    todays = [grn for grn in receipts if grn.received_at >= today_start]
    open_discrepancy = Discrepancy.status != DiscrepancyStatus.RESOLVED

    return DashboardOut(
        receipts_today=len(todays),
        units_today=sum(line.received_qty for grn in todays for line in grn.lines),
        open_pos=db.scalar(
            select(func.count())
            .select_from(PurchaseOrder)
            .where(PurchaseOrder.status.in_([POStatus.OPEN, POStatus.PARTIALLY_RECEIVED]))
        )
        or 0,
        open_discrepancies=db.scalar(
            select(func.count()).select_from(Discrepancy).where(open_discrepancy)
        )
        or 0,
        open_shortage_value=round(
            db.scalar(select(func.coalesce(func.sum(Discrepancy.value), 0)).where(open_discrepancy))
            or 0.0,
            2,
        ),
        fill_rate=_pct(received_total, expected_total),
        inventory_value=round(
            db.scalar(select(func.coalesce(func.sum(Item.on_hand * Item.unit_cost), 0))) or 0.0, 2
        ),
        low_stock_items=db.scalar(
            select(func.count()).select_from(Item).where(Item.on_hand < Item.reorder_point)
        )
        or 0,
        daily=list(daily.values()),
        vendors=sorted(
            (
                VendorPerformance(
                    vendor_name=name,
                    receipts=int(s["receipts"]),
                    fill_rate=_pct(s["received"], s["expected"]),
                    shortage_value=round(s["shortage_value"], 2),
                )
                for name, s in vendor_stats.items()
            ),
            key=lambda v: v.fill_rate,
        ),
        recent_receipts=[grn_summary(grn) for grn in receipts[:6]],
    )


def _pct(part: float, whole: float) -> float:
    return round(100 * part / whole, 1) if whole else 100.0
