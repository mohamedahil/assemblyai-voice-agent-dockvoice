from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DB
from app.db.seed import reset_database
from app.db.session import engine

router = APIRouter(tags=["system"])


@router.get("/health")
def health(db: DB) -> dict[str, str]:
    # Touch the database so uptime pings also keep a free-tier Postgres from pausing.
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@router.post("/demo/reset")
def reset_demo(db: DB) -> dict[str, str]:
    db.close()
    reset_database(engine)
    return {"status": "reset"}
