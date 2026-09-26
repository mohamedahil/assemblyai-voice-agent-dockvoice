from enum import StrEnum


class POStatus(StrEnum):
    OPEN = "open"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CLOSED = "closed"


class DraftState(StrEnum):
    """Lifecycle of a spoken receipt. Only AWAITING_CONFIRMATION can be posted."""

    DRAFT = "draft"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    POSTED = "posted"
    CANCELLED = "cancelled"


class DiscrepancyType(StrEnum):
    SHORTAGE = "shortage"
    OVER_RECEIPT = "over_receipt"
    DAMAGED = "damaged"


class DiscrepancyStatus(StrEnum):
    OPEN = "open"
    VENDOR_NOTIFIED = "vendor_notified"
    RESOLVED = "resolved"


class MessageStatus(StrEnum):
    SENT = "sent"
    SIMULATED = "simulated"
    FAILED = "failed"


class MovementType(StrEnum):
    RECEIPT = "receipt"
    ISSUE = "issue"
    QUARANTINE = "quarantine"
