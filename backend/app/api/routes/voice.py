from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel

from app.agent.session import VoiceSessionOut, VoiceTokenError, create_voice_session
from app.agent.tools import PHASE_TOOLS, Phase, run_tool
from app.api.deps import DB, AppSettings
from app.schemas import DraftView
from app.services.receiving import ReceivingService

router = APIRouter(prefix="/voice", tags=["voice"])

SessionId = Annotated[str, Path(pattern=r"^[A-Za-z0-9_-]{8,64}$")]


class ToolRequest(BaseModel):
    arguments: dict[str, Any] = {}


class ToolResponse(BaseModel):
    ok: bool
    # Sent back to the agent verbatim as the tool.result payload.
    result: dict[str, Any]
    phase: Phase
    # The tool set the agent should have for this phase (progressive reveal).
    tools: list[dict[str, Any]]
    draft: DraftView | None


@router.post("/session")
def start_session(db: DB, settings: AppSettings) -> VoiceSessionOut:
    try:
        return create_voice_session(db, settings)
    except VoiceTokenError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/sessions/{session_id}/tools/{name}")
def call_tool(
    session_id: SessionId, name: str, body: ToolRequest, db: DB, settings: AppSettings
) -> ToolResponse:
    outcome = run_tool(db, settings, session_id, name, body.arguments)
    return ToolResponse(
        ok=outcome.ok,
        result=outcome.result,
        phase=outcome.phase,
        tools=PHASE_TOOLS[outcome.phase],
        draft=outcome.draft,
    )


@router.get("/sessions/{session_id}/draft")
def get_draft(session_id: SessionId, db: DB) -> DraftView | None:
    svc = ReceivingService(db, session_id)
    draft = svc.current()
    return svc.view(draft) if draft else None
