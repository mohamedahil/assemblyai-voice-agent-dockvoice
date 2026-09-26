from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.main import create_app

SESSION = "sess_test_0001"


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    # No context manager: skip the lifespan so the real database is never touched.
    yield TestClient(app)


def call(client: TestClient, name: str, **arguments: Any) -> dict[str, Any]:
    response = client.post(
        f"/api/voice/sessions/{SESSION}/tools/{name}", json={"arguments": arguments}
    )
    assert response.status_code == 200
    body: dict[str, Any] = response.json()
    return body


def tool_names(body: dict[str, Any]) -> set[str]:
    return {tool["name"] for tool in body["tools"]}


def test_full_voice_receiving_flow(client: TestClient) -> None:
    opened = call(client, "open_purchase_order", po_number="4 5 8 2", vendor_name="ABC Electronics")
    assert opened["ok"] and opened["phase"] == "counting"
    assert "post_goods_receipt" not in tool_names(opened)

    recorded = call(
        client,
        "record_received_quantities",
        counts=[
            {"item": "controllers", "quantity": 80},
            {"item": "sensors", "quantity": 45},
            {"item": "power modules", "quantity": 80},
        ],
    )
    assert recorded["result"]["warnings"], "80 of 20 power modules should be flagged"

    corrected = call(
        client, "record_received_quantities", counts=[{"item": "power mods", "quantity": 18}]
    )
    assert corrected["result"]["recorded"][0]["previous"] == 80

    damaged = call(client, "record_damage", item="sensors", quantity=3, note="cracked")
    assert damaged["ok"] and damaged["result"]["good"] == 42
    assert "record_damage" in tool_names(damaged)

    blocked = call(client, "post_goods_receipt")
    assert not blocked["ok"]

    reviewed = call(client, "review_receipt")
    assert reviewed["phase"] == "confirming"
    assert "post_goods_receipt" in tool_names(reviewed)
    assert {s["quantity"] for s in reviewed["result"]["shortages"]} == {20, 5, 2}
    assert reviewed["result"]["damaged"][0]["quantity"] == 3

    posted = call(client, "post_goods_receipt")
    assert posted["ok"] and posted["phase"] == "posted"
    assert posted["draft"]["grn_number"] == posted["result"]["grn_number"]
    assert tool_names(posted) == {"open_purchase_order", "notify_vendor"}

    notified = call(
        client,
        "notify_vendor",
        message="Please ship the missing controllers.",
        due_date="2099-01-02",
    )
    assert notified["ok"] and notified["result"]["status"] == "simulated"

    activity = client.get("/api/activity", params={"session_id": SESSION}).json()
    assert len(activity) == 8

    grn = client.get(f"/api/receipts/{posted['result']['grn_number']}").json()
    assert grn["total_units"] == 143 and grn["discrepancy_count"] == 4
    message = client.get("/api/vendor-messages").json()[0]
    assert "replacement requested" in message["subject"]
    assert "Replacement requested" in message["body_html"]
    assert client.get("/api/vendor-messages").json()[0]["po_number"] == "PO-4582"


def test_erp_read_endpoints(client: TestClient) -> None:
    dashboard = client.get("/api/dashboard").json()
    assert dashboard["open_pos"] >= 6 and len(dashboard["daily"]) == 14

    open_pos = client.get("/api/purchase-orders", params={"status": "open"}).json()
    assert "PO-4582" in {po["number"] for po in open_pos}

    detail = client.get("/api/purchase-orders/po-4582").json()
    assert [line["item"]["sku"] for line in detail["lines"]] == ["CTL-200", "SNS-450", "PWR-24V"]

    assert client.get("/api/purchase-orders/PO-0000").status_code == 404
    assert client.get("/api/inventory/items").json()
    assert client.get("/api/inventory/movements").json()
    assert client.get("/api/discrepancies").json()
