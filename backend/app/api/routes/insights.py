from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.deps import DB
from app.db.models import ToolCall
from app.schemas import DashboardOut, ToolCallOut
from app.services.dashboard import build_dashboard

router = APIRouter(tags=["insights"])


@router.get("/dashboard")
def dashboard(db: DB) -> DashboardOut:
    return build_dashboard(db)


@router.get("/activity")
def activity(
    db: DB, session_id: str | None = None, limit: int = Query(100, le=500)
) -> list[ToolCallOut]:
    query = select(ToolCall).order_by(ToolCall.id.desc()).limit(limit)
    if session_id:
        query = query.where(ToolCall.session_id == session_id)
    return [ToolCallOut.model_validate(call) for call in db.scalars(query).all()]
