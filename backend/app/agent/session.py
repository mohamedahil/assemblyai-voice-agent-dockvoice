"""Bootstraps a browser voice session: a single-use AssemblyAI token plus inline agent config."""

import uuid
from datetime import date
from typing import Any

import httpx
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agent.prompt import GREETING, TRANSCRIPTION_PROMPT, build_keyterms, build_system_prompt
from app.agent.tools import PHASE_TOOLS, Phase
from app.config import Settings

TOKEN_URL = "https://agents.assemblyai.com/v1/token"
WS_URL = "wss://agents.assemblyai.com/v1/ws"


class VoiceSessionOut(BaseModel):
    session_id: str
    token: str
    ws_url: str
    max_session_seconds: int
    session_config: dict[str, Any]


class VoiceTokenError(RuntimeError):
    pass


def create_voice_session(db: Session, settings: Settings) -> VoiceSessionOut:
    if not settings.assemblyai_api_key:
        raise VoiceTokenError("ASSEMBLYAI_API_KEY is not configured on the server.")

    try:
        response = httpx.get(
            TOKEN_URL,
            params={
                "expires_in_seconds": settings.token_ttl_seconds,
                "max_session_duration_seconds": settings.max_session_seconds,
            },
            headers={"Authorization": f"Bearer {settings.assemblyai_api_key}"},
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise VoiceTokenError(f"Could not get an AssemblyAI token: {exc}") from exc

    return VoiceSessionOut(
        session_id=uuid.uuid4().hex,
        token=response.json()["token"],
        ws_url=WS_URL,
        max_session_seconds=settings.max_session_seconds,
        session_config={
            "system_prompt": build_system_prompt(date.today()),
            "greeting": GREETING,
            "tools": PHASE_TOOLS[Phase.IDENTIFY],
            "input": {
                "keyterms": build_keyterms(db),
                "transcription_prompt": TRANSCRIPTION_PROMPT,
            },
            "output": {"voice": settings.agent_voice},
        },
    )
