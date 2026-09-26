import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect

from app.api.routes import erp, insights, system, voice
from app.config import get_settings
from app.db.seed import reset_database
from app.db.session import engine

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # First boot on an empty database: create the schema and load the demo dataset.
    if not inspect(engine).has_table("purchase_orders"):
        reset_database(engine)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Warehouse Voice Copilot", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_settings().cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    for module in (voice, erp, insights, system):
        app.include_router(module.router, prefix="/api")
    return app


app = create_app()
