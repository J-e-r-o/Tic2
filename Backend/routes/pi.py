from fastapi import APIRouter
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pi", tags=["pi"])

# Comando pendiente en memoria — None si no hay nada, "capture" si hay orden
_pending_command: dict | None = None


@router.post("/command")
def enqueue_command():
    """El dashboard admin encola una orden para que la Pi saque una foto."""
    global _pending_command
    _pending_command = {
        "command": "capture",
        "queued_at": datetime.now(timezone.utc).isoformat(),
    }
    logger.info("Comando 'capture' encolado para la Pi")
    return {"status": "ok", "command": "capture"}


@router.get("/command")
def poll_command():
    """La Pi consulta si hay un comando pendiente. Si lo hay, lo consume."""
    global _pending_command
    if _pending_command is None:
        return {"command": None}
    cmd = _pending_command
    _pending_command = None  # consume el comando
    logger.info(f"Comando '{cmd['command']}' entregado a la Pi")
    return cmd
