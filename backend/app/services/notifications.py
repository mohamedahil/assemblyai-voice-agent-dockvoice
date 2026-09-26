"""Vendor shortage notices, sent through Resend when configured and recorded in the outbox."""

import html
import logging
from datetime import date

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.db.models import Discrepancy, GoodsReceipt, ReceiptDraft, VendorMessage
from app.domain.enums import DiscrepancyStatus, DiscrepancyType, DraftState, MessageStatus
from app.domain.errors import DomainError

log = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"


class VendorNotifier:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings

    def notify_latest_receipt(
        self, session_id: str, note: str, due_date: date | None
    ) -> VendorMessage:
        grn = self._latest_posted_receipt(session_id)
        if due_date is not None and due_date < date.today():
            raise DomainError(f"{due_date.isoformat()} is in the past. Ask for a future due date.")

        po = grn.purchase_order
        vendor = po.vendor
        open_items = [d for d in grn.discrepancies if d.status == DiscrepancyStatus.OPEN]
        subject = _subject(po.number, grn.number, open_items)
        text, body_html = _compose(
            vendor.contact_name, po.number, grn.number, open_items, note, due_date
        )

        to_email = self.settings.vendor_email_override or vendor.email
        status, error = self._send(to_email, subject, text, body_html)

        message = VendorMessage(
            vendor_id=vendor.id,
            po_id=po.id,
            to_email=to_email,
            subject=subject,
            body_text=text,
            body_html=body_html,
            due_date=due_date,
            status=status,
            error=error,
        )
        self.db.add(message)
        if status != MessageStatus.FAILED:
            for discrepancy in open_items:
                discrepancy.status = DiscrepancyStatus.VENDOR_NOTIFIED
        self.db.flush()
        return message

    def _latest_posted_receipt(self, session_id: str) -> GoodsReceipt:
        draft = self.db.scalars(
            select(ReceiptDraft)
            .where(ReceiptDraft.session_id == session_id, ReceiptDraft.state == DraftState.POSTED)
            .order_by(ReceiptDraft.id.desc())
            .limit(1)
        ).first()
        if draft is None or draft.grn_id is None:
            raise DomainError(
                "Nothing has been posted yet in this session. Post the receipt first."
            )
        grn = self.db.get(GoodsReceipt, draft.grn_id)
        assert grn is not None
        return grn

    def _send(
        self, to: str, subject: str, text: str, body_html: str
    ) -> tuple[MessageStatus, str | None]:
        if not self.settings.resend_api_key:
            return MessageStatus.SIMULATED, None
        try:
            response = httpx.post(
                RESEND_URL,
                headers={"Authorization": f"Bearer {self.settings.resend_api_key}"},
                json={
                    "from": self.settings.email_from,
                    "to": [to],
                    "subject": subject,
                    "text": text,
                    "html": body_html,
                },
                timeout=10,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            log.warning("Vendor email failed: %s", exc)
            return MessageStatus.FAILED, str(exc)
        return MessageStatus.SENT, None


def _subject(po_number: str, grn_number: str, discrepancies: list[Discrepancy]) -> str:
    if any(d.type == DiscrepancyType.DAMAGED for d in discrepancies):
        return f"Damaged goods on {po_number} ({grn_number}): replacement requested"
    return f"Receiving discrepancy on {po_number} ({grn_number})"


def _issue_label(d: Discrepancy) -> str:
    label = d.type.value.replace("_", " ")
    return f"{label} ({d.note})" if d.note else label


def _compose(
    contact: str,
    po_number: str,
    grn_number: str,
    discrepancies: list[Discrepancy],
    note: str,
    due_date: date | None,
) -> tuple[str, str]:
    rows = [(d.item.name, d.item.sku, _issue_label(d), d.quantity, d.type) for d in discrepancies]
    damaged = [d for d in discrepancies if d.type == DiscrepancyType.DAMAGED]
    replacement = (
        "Please ship replacements for the damaged units: "
        + ", ".join(f"{d.quantity} x {d.item.name}" for d in damaged)
        + ". The damaged units are held in quarantine for your return authorization."
        if damaged
        else ""
    )
    due = f"Please resolve by {due_date.strftime('%A, %B %d')}." if due_date else ""

    text_lines = [
        f"Hi {contact},",
        "",
        f"We received {po_number} today (goods receipt {grn_number}) with these discrepancies:",
        *[f"  - {name} ({sku}): {issue}, {qty}" for name, sku, issue, qty, _ in rows],
        "",
        *([replacement, ""] if replacement else []),
        note,
        due,
        "",
        "Thanks,",
        "Receiving Dock - sent by Warehouse Voice Copilot",
    ]

    cell = "padding:8px 12px;border-bottom:1px solid #e5e7eb"
    row_html = "".join(
        f"<tr style='{'background:#fef2f2' if kind == DiscrepancyType.DAMAGED else ''}'>"
        f"<td style='{cell}'>{html.escape(name)}</td>"
        f"<td style='{cell};font-family:monospace'>{sku}</td>"
        f"<td style='{cell}'>{html.escape(issue)}</td>"
        f"<td style='{cell};text-align:right'><b>{qty}</b></td></tr>"
        for name, sku, issue, qty, kind in rows
    )
    replacement_html = (
        f"<p style='padding:10px 12px;border-left:3px solid #dc2626;background:#fef2f2'>"
        f"<b>Replacement requested.</b> {html.escape(replacement)}</p>"
        if replacement
        else ""
    )
    body_html = f"""
<div style="font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;max-width:560px">
  <p>Hi {html.escape(contact)},</p>
  <p>We received <b>{po_number}</b> today (goods receipt <b>{grn_number}</b>) with the following
  discrepancies:</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <thead><tr style="background:#f1f5f9;text-align:left">
      <th style="padding:8px 12px">Item</th><th style="padding:8px 12px">SKU</th>
      <th style="padding:8px 12px">Issue</th><th style="padding:8px 12px;text-align:right">Qty</th>
    </tr></thead>
    <tbody>{row_html}</tbody>
  </table>
  {replacement_html}
  <p>{html.escape(note)}</p>
  <p><b>{html.escape(due)}</b></p>
  <p style="color:#64748b;font-size:12px">Receiving Dock - sent by Warehouse Voice Copilot</p>
</div>"""
    return "\n".join(text_lines), body_html
