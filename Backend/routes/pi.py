from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import PiCommand
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pi", tags=["pi"])


def _get_or_create(db: Session) -> PiCommand:
    row = db.query(PiCommand).filter(PiCommand.id == 1).first()
    if not row:
        row = PiCommand(id=1, command=None, queued_at=None)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.post("/command")
def enqueue_command(db: Session = Depends(get_db)):
    """El dashboard admin encola una orden para que la Pi saque una foto."""
    row = _get_or_create(db)
    row.command = "capture"
    row.queued_at = datetime.now(timezone.utc)
    db.commit()
    logger.info("Comando 'capture' encolado para la Pi")
    return {"status": "ok", "command": "capture"}


@router.get("/command")
def poll_command(db: Session = Depends(get_db)):
    """La Pi consulta si hay un comando pendiente. Si lo hay, lo consume."""
    row = _get_or_create(db)
    if row.command is None:
        return {"command": None}
    cmd = row.command
    row.command = None
    row.queued_at = None
    db.commit()
    logger.info(f"Comando '{cmd}' entregado a la Pi")
    return {"command": cmd}
