import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Discrepancy, GoodsReceipt, Item, PurchaseOrder
from app.domain.enums import DiscrepancyType, DraftState, POStatus
from app.domain.errors import DomainError, NotFoundError
from app.services.receiving import ReceivingService, normalize_po_number


@pytest.fixture
def svc(db: Session) -> ReceivingService:
    return ReceivingService(db, session_id="test-session")


def _receive_demo(svc: ReceivingService) -> None:
    svc.open_po("4582", "ABC Electronics")
    svc.set_quantity("controllers", 80)
    svc.set_quantity("sensors", 45)
    svc.set_quantity("power modules", 18)


@pytest.mark.parametrize("spoken", ["4582", "PO 4582", "po-45 82", "P.O. #4582"])
def test_normalize_po_number(spoken: str) -> None:
    assert normalize_po_number(spoken) == "PO-4582"


def test_open_unknown_po(svc: ReceivingService) -> None:
    with pytest.raises(NotFoundError):
        svc.open_po("9999")


def test_open_po_rejects_wrong_vendor(svc: ReceivingService) -> None:
    with pytest.raises(DomainError, match="ABC Electronics"):
        svc.open_po("4582", "Titan Industrial Supply")


def test_open_same_po_twice_is_idempotent(svc: ReceivingService) -> None:
    first = svc.open_po("4582")
    assert svc.open_po("PO-4582").id == first.id


@pytest.mark.parametrize(
    ("spoken", "sku"),
    [
        ("controllers", "CTL-200"),
        ("motor controller", "CTL-200"),
        ("proximity sensors", "SNS-450"),
        ("power mods", "PWR-24V"),
        ("PWR-24V", "PWR-24V"),
    ],
)
def test_spoken_item_matching(svc: ReceivingService, spoken: str, sku: str) -> None:
    svc.open_po("4582")
    draft, _ = svc.set_quantity(spoken, 1)
    view = svc.view(draft)
    assert next(line for line in view.lines if line.sku == sku).received_qty == 1


def test_unknown_item_lists_po_lines(svc: ReceivingService) -> None:
    svc.open_po("4582")
    with pytest.raises(DomainError, match="Motor Controller MC-200"):
        svc.set_quantity("bananas", 3)


def test_correction_overwrites_instead_of_adding(svc: ReceivingService) -> None:
    svc.open_po("4582")
    svc.set_quantity("power modules", 80)
    draft, change = svc.set_quantity("power modules", 18)
    assert change.previous == 80
    assert change.current == 18
    line = next(li for li in svc.view(draft).lines if li.sku == "PWR-24V")
    assert line.received_qty == 18
    assert line.status == "short"


def test_suspicious_quantity_is_flagged(svc: ReceivingService) -> None:
    svc.open_po("4582")
    _, change = svc.set_quantity("power modules", 80)
    assert change.warning is not None and "Double-check" in change.warning


def test_review_requires_every_line(svc: ReceivingService) -> None:
    svc.open_po("4582")
    svc.set_quantity("controllers", 80)
    with pytest.raises(DomainError, match="Proximity Sensor"):
        svc.review()


def test_cannot_post_without_review(svc: ReceivingService) -> None:
    _receive_demo(svc)
    with pytest.raises(DomainError, match="not confirmed"):
        svc.post()


def test_correction_after_review_requires_new_review(svc: ReceivingService) -> None:
    _receive_demo(svc)
    svc.review()
    draft, _ = svc.set_quantity("sensors", 48)
    assert draft.state == DraftState.DRAFT
    with pytest.raises(DomainError):
        svc.post()


def test_post_creates_grn_inventory_and_discrepancies(svc: ReceivingService, db: Session) -> None:
    controllers_before = db.scalars(select(Item).where(Item.sku == "CTL-200")).one().on_hand
    _receive_demo(svc)
    svc.review()
    result = svc.post()

    assert result.po_status == POStatus.PARTIALLY_RECEIVED
    assert result.units_received == 143
    assert {(d.item, d.quantity) for d in result.discrepancies} == {
        ("Motor Controller MC-200", 20),
        ("Proximity Sensor PS-450", 5),
        ("Power Module 24V", 2),
    }
    assert all(d.type == DiscrepancyType.SHORTAGE for d in result.discrepancies)

    grn = db.scalars(select(GoodsReceipt).where(GoodsReceipt.number == result.grn_number)).one()
    assert len(grn.lines) == 3
    assert (
        db.scalars(select(Item).where(Item.sku == "CTL-200")).one().on_hand
        == controllers_before + 80
    )
    assert len(db.scalars(select(Discrepancy).where(Discrepancy.grn_id == grn.id)).all()) == 3

    # A posted draft can't be posted again.
    with pytest.raises(DomainError):
        svc.post()


def test_second_receipt_expects_only_outstanding(svc: ReceivingService, db: Session) -> None:
    _receive_demo(svc)
    svc.review()
    svc.post()

    draft = svc.open_po("4582")
    expected = {line.sku: line.expected_qty for line in svc.view(draft).lines}
    assert expected == {"CTL-200": 20, "SNS-450": 5, "PWR-24V": 2}

    svc.set_quantity("controllers", 20)
    svc.set_quantity("sensors", 5)
    svc.set_quantity("power modules", 2)
    svc.review()
    result = svc.post()
    assert result.discrepancies == []
    po = db.scalars(select(PurchaseOrder).where(PurchaseOrder.number == "PO-4582")).one()
    assert po.status == POStatus.RECEIVED


# ---- Damaged goods ----------------------------------------------------------------------------


def test_damage_requires_a_count_first(svc: ReceivingService) -> None:
    svc.open_po("4582")
    with pytest.raises(DomainError, match="No count yet"):
        svc.record_damage("sensors", 3, "cracked")


def test_damage_cannot_exceed_arrived(svc: ReceivingService) -> None:
    svc.open_po("4582")
    svc.set_quantity("sensors", 2)
    with pytest.raises(DomainError, match="more than the 2"):
        svc.record_damage("sensors", 3)


def test_lowering_count_below_damage_is_rejected(svc: ReceivingService) -> None:
    svc.open_po("4582")
    svc.set_quantity("sensors", 45)
    svc.record_damage("sensors", 3)
    with pytest.raises(DomainError, match="reported damaged"):
        svc.set_quantity("sensors", 2)


def test_damage_after_review_requires_new_review(svc: ReceivingService) -> None:
    _receive_demo(svc)
    svc.review()
    draft, _ = svc.record_damage("sensors", 3, "cracked")
    assert draft.state == DraftState.DRAFT
    with pytest.raises(DomainError, match="not confirmed"):
        svc.post()


def test_zero_damage_clears_it(svc: ReceivingService) -> None:
    _receive_demo(svc)
    svc.record_damage("sensors", 3, "cracked")
    draft, change = svc.record_damage("sensors", 0)
    assert change.good == 45
    assert draft.damages == {}


def test_post_quarantines_damaged_units(svc: ReceivingService, db: Session) -> None:
    sensors = db.scalars(select(Item).where(Item.sku == "SNS-450")).one()
    on_hand_before, quarantined_before = sensors.on_hand, sensors.quarantined

    _receive_demo(svc)
    svc.record_damage("sensors", 3, "cracked housing")
    svc.review()
    result = svc.post()

    assert result.units_received == 140  # 80 + 42 good + 18
    assert result.units_quarantined == 3
    assert sensors.on_hand == on_hand_before + 42
    assert sensors.quarantined == quarantined_before + 3

    damaged = [d for d in result.discrepancies if d.type == DiscrepancyType.DAMAGED]
    assert [(d.item, d.quantity, d.note) for d in damaged] == [
        ("Proximity Sensor PS-450", 3, "cracked housing")
    ]
    # The PO stays open for the 5 short plus the 3 damaged awaiting replacement.
    po = db.scalars(select(PurchaseOrder).where(PurchaseOrder.number == "PO-4582")).one()
    sensor_line = next(line for line in po.lines if line.item.sku == "SNS-450")
    assert sensor_line.outstanding_qty == 8
