from datetime import UTC, datetime

from sqlalchemy.orm import DeclarativeBase


def utcnow() -> datetime:
    """Naive UTC timestamp. Stored naive so SQLite (dev) and Postgres (prod) behave the same."""
    return datetime.now(UTC).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass
