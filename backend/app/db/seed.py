"""Deterministic demo dataset: vendors, items, open POs and three weeks of receiving history."""

import random
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.db.base import Base, utcnow
from app.db.models import (
    Discrepancy,
    GoodsReceipt,
    GRNLine,
    InventoryMovement,
    Item,
    POLine,
    PurchaseOrder,
    Vendor,
)
from app.domain.enums import DiscrepancyStatus, DiscrepancyType, MovementType, POStatus


@dataclass(frozen=True)
class ItemSpec:
    sku: str
    name: str
    category: str
    unit: str
    unit_cost: float
    on_hand: int
    reorder_point: int
    bin_location: str
    aliases: tuple[str, ...]


VENDORS = [
    ("ABC", "ABC Electronics", "orders@abc-electronics.example", "Priya Raman", "Austin, TX"),
    ("NWP", "Northwind Packaging", "supply@northwind.example", "Tom Becker", "Chicago, IL"),
    ("HLX", "Helix Components", "sales@helix.example", "Mei Chen", "San Jose, CA"),
    ("TIS", "Titan Industrial Supply", "desk@titan-supply.example", "Luis Ortega", "Detroit, MI"),
    ("MRF", "Meridian Fasteners", "orders@meridian.example", "Anna Kowalski", "Cleveland, OH"),
]

ITEMS: dict[str, list[ItemSpec]] = {
    "ABC": [
        ItemSpec(
            "CTL-200",
            "Motor Controller MC-200",
            "Electronics",
            "ea",
            84.0,
            42,
            60,
            "A-01-03",
            ("controllers", "controller", "motor controllers", "MC 200"),
        ),
        ItemSpec(
            "SNS-450",
            "Proximity Sensor PS-450",
            "Electronics",
            "ea",
            23.5,
            130,
            80,
            "A-02-01",
            ("sensors", "sensor", "proximity sensors", "PS 450"),
        ),
        ItemSpec(
            "PWR-24V",
            "Power Module 24V",
            "Electronics",
            "ea",
            57.0,
            12,
            25,
            "A-02-04",
            ("power modules", "power module", "power mods", "PSU", "power supplies"),
        ),
        ItemSpec(
            "RLY-008",
            "Relay Board RB-8",
            "Electronics",
            "ea",
            31.0,
            64,
            40,
            "A-03-02",
            ("relay boards", "relays", "relay board"),
        ),
    ],
    "NWP": [
        ItemSpec(
            "BOX-2418",
            "Corrugated Box 24x18",
            "Packaging",
            "ea",
            1.2,
            1800,
            1000,
            "P-01-01",
            ("boxes", "cartons", "corrugated boxes"),
        ),
        ItemSpec(
            "WRP-500",
            "Stretch Wrap Roll 500m",
            "Packaging",
            "roll",
            18.0,
            55,
            40,
            "P-02-02",
            ("stretch wrap", "wrap", "wrap rolls"),
        ),
        ItemSpec(
            "LBL-4X6",
            "Pallet Label Roll 4x6",
            "Packaging",
            "roll",
            9.5,
            90,
            50,
            "P-02-05",
            ("labels", "label rolls", "pallet labels"),
        ),
    ],
    "HLX": [
        ItemSpec(
            "STP-N23",
            "Stepper Motor NEMA 23",
            "Motion",
            "ea",
            46.0,
            38,
            30,
            "M-01-02",
            ("stepper motors", "steppers", "motors", "NEMA 23"),
        ),
        ItemSpec(
            "ENC-1024",
            "Rotary Encoder 1024PPR",
            "Motion",
            "ea",
            39.0,
            25,
            30,
            "M-01-04",
            ("encoders", "rotary encoders", "encoder"),
        ),
        ItemSpec(
            "HRN-2M",
            "Cable Harness 2m",
            "Motion",
            "ea",
            12.0,
            140,
            80,
            "M-03-01",
            ("harnesses", "cable harnesses", "cables"),
        ),
    ],
    "TIS": [
        ItemSpec(
            "GLV-NTR",
            "Nitrile Safety Gloves (box)",
            "Safety",
            "box",
            14.0,
            60,
            40,
            "S-01-01",
            ("gloves", "safety gloves", "glove boxes"),
        ),
        ItemSpec(
            "HSE-050",
            "Hydraulic Hose 1/2in",
            "Hydraulics",
            "ea",
            22.0,
            48,
            30,
            "H-02-03",
            ("hoses", "hydraulic hoses", "hose"),
        ),
        ItemSpec(
            "BRG-6204",
            "Ball Bearing 6204",
            "Mechanical",
            "ea",
            4.8,
            420,
            300,
            "H-04-01",
            ("bearings", "ball bearings", "6204"),
        ),
    ],
    "MRF": [
        ItemSpec(
            "BLT-M8",
            "Hex Bolt M8 (box of 100)",
            "Fasteners",
            "box",
            11.0,
            75,
            50,
            "F-01-01",
            ("bolts", "hex bolts", "M8 bolts"),
        ),
        ItemSpec(
            "NUT-M8",
            "Lock Nut M8 (box of 100)",
            "Fasteners",
            "box",
            8.0,
            70,
            50,
            "F-01-02",
            ("nuts", "lock nuts", "M8 nuts"),
        ),
        ItemSpec(
            "WSH-M8",
            "Washer M8 (box of 200)",
            "Fasteners",
            "box",
            5.5,
            40,
            40,
            "F-01-03",
            ("washers", "M8 washers"),
        ),
    ],
}

# Open POs waiting at the dock. PO-4582 is the scripted demo.
OPEN_POS: list[tuple[str, str, list[tuple[str, int]]]] = [
    ("PO-4582", "ABC", [("CTL-200", 100), ("SNS-450", 50), ("PWR-24V", 20)]),
    ("PO-4583", "NWP", [("BOX-2418", 500), ("WRP-500", 40), ("LBL-4X6", 60)]),
    ("PO-4587", "HLX", [("STP-N23", 30), ("ENC-1024", 30), ("HRN-2M", 60)]),
    ("PO-4590", "TIS", [("GLV-NTR", 25), ("HSE-050", 40), ("BRG-6204", 200)]),
    ("PO-4594", "MRF", [("BLT-M8", 80), ("NUT-M8", 80), ("WSH-M8", 50)]),
    ("PO-4596", "ABC", [("RLY-008", 40), ("SNS-450", 100)]),
]

HISTORY_DAYS = 21
HISTORY_PO_COUNT = 26
FIRST_HISTORY_PO = 4540
FIRST_GRN = 1001


def reset_database(engine: Engine) -> None:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        seed(db)
        db.commit()


def seed(db: Session) -> None:
    rng = random.Random(42)
    today = date.today()

    vendors = {
        code: Vendor(code=code, name=name, email=email, contact_name=contact, city=city)
        for code, name, email, contact, city in VENDORS
    }
    db.add_all(vendors.values())

    items: dict[str, Item] = {}
    vendor_items: dict[str, list[Item]] = {}
    for vendor_code, specs in ITEMS.items():
        for spec in specs:
            item = Item(
                sku=spec.sku,
                name=spec.name,
                category=spec.category,
                unit=spec.unit,
                unit_cost=spec.unit_cost,
                on_hand=spec.on_hand,
                reorder_point=spec.reorder_point,
                bin_location=spec.bin_location,
                aliases=list(spec.aliases),
            )
            items[spec.sku] = item
            vendor_items.setdefault(vendor_code, []).append(item)
    db.add_all(items.values())
    db.flush()

    _seed_history(db, rng, today, vendors, vendor_items)

    for number, vendor_code, lines in OPEN_POS:
        po = PurchaseOrder(
            number=number,
            vendor=vendors[vendor_code],
            status=POStatus.OPEN,
            order_date=today - timedelta(days=rng.randint(6, 12)),
            expected_date=today + timedelta(days=rng.randint(0, 2)),
        )
        po.lines = [
            POLine(line_no=i + 1, item_id=items[sku].id, ordered_qty=qty)
            for i, (sku, qty) in enumerate(lines)
        ]
        db.add(po)


def _seed_history(
    db: Session,
    rng: random.Random,
    today: date,
    vendors: dict[str, Vendor],
    vendor_items: dict[str, list[Item]],
) -> None:
    """Closed and partially received POs with GRNs spread over the last three weeks."""
    now = utcnow()
    vendor_codes = list(vendors)
    for n in range(HISTORY_PO_COUNT):
        vendor_code = rng.choice(vendor_codes)
        received_at = now - timedelta(
            days=rng.randint(0, HISTORY_DAYS - 1),
            hours=rng.randint(1, 9),
            minutes=rng.randint(0, 59),
        )
        po = PurchaseOrder(
            number=f"PO-{FIRST_HISTORY_PO + n}",
            vendor=vendors[vendor_code],
            order_date=received_at.date() - timedelta(days=rng.randint(7, 14)),
            expected_date=received_at.date(),
            created_at=received_at - timedelta(days=10),
        )
        picked = rng.sample(
            vendor_items[vendor_code], k=rng.randint(2, len(vendor_items[vendor_code]))
        )
        po.lines = [
            POLine(
                line_no=i + 1, item_id=item.id, ordered_qty=rng.choice([20, 25, 40, 50, 60, 100])
            )
            for i, item in enumerate(picked)
        ]
        db.add(po)
        db.flush()

        grn = GoodsReceipt(
            number=f"GRN-{FIRST_GRN + n}", po_id=po.id, source="manual", received_at=received_at
        )
        db.add(grn)
        db.flush()

        short_any = False
        for line in po.lines:
            item = next(i for i in picked if i.id == line.item_id)
            short = rng.random() < 0.22
            received = (
                line.ordered_qty - rng.randint(1, max(2, line.ordered_qty // 5))
                if short
                else line.ordered_qty
            )
            line.received_qty = received
            grn.lines.append(
                GRNLine(
                    po_line_id=line.id,
                    item_id=item.id,
                    expected_qty=line.ordered_qty,
                    received_qty=received,
                )
            )
            db.add(
                InventoryMovement(
                    item_id=item.id,
                    type=MovementType.RECEIPT,
                    quantity=received,
                    on_hand_after=item.on_hand,
                    reference=grn.number,
                    created_at=received_at,
                )
            )
            if short:
                short_any = True
                missing = line.ordered_qty - received
                db.add(
                    Discrepancy(
                        grn_id=grn.id,
                        po_id=po.id,
                        item_id=item.id,
                        type=DiscrepancyType.SHORTAGE,
                        quantity=missing,
                        value=round(missing * item.unit_cost, 2),
                        status=_historic_discrepancy_status(rng, received_at, now),
                        created_at=received_at,
                    )
                )
        po.status = POStatus.PARTIALLY_RECEIVED if short_any else POStatus.RECEIVED


def _historic_discrepancy_status(
    rng: random.Random, created_at: datetime, now: datetime
) -> DiscrepancyStatus:
    age_days = (now - created_at).days
    if age_days > 10:
        return DiscrepancyStatus.RESOLVED
    return rng.choice([DiscrepancyStatus.OPEN, DiscrepancyStatus.VENDOR_NOTIFIED])
