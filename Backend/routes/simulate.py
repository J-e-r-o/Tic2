from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import SimulationResult
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/simulate", tags=["simulation"])

class SimulationCreate(BaseModel):
    name: str
    parameters: Optional[dict] = None

class SimulationResponse(BaseModel):
    id: int
    simulation_name: str
    status: str
    
    class Config:
        from_attributes = True

@router.post("/start", response_model=SimulationResponse)
async def start_simulation(sim: SimulationCreate, db: Session = Depends(get_db)):
    """
    Inicia una nueva simulación
    """
    simulation = SimulationResult(
        simulation_name=sim.name,
        status="pending",
        result_data="{}",
    )
    
    db.add(simulation)
    db.commit()
    db.refresh(simulation)
    
    # AQUÍ IRÍA LA LÓGICA PARA EJECUTAR LA SIMULACIÓN (usar simulator/ folder)
    # simulation.status = "running"
    # db.commit()
    
    return simulation

@router.get("/{simulation_id}", response_model=SimulationResponse)
async def get_simulation(simulation_id: int, db: Session = Depends(get_db)):
    """
    Obtiene el estado de una simulación
    """
    simulation = db.query(SimulationResult).filter(
        SimulationResult.id == simulation_id
    ).first()
    
    if not simulation:
        return {"status": "error", "message": "Simulación no encontrada"}
    
    return simulation

@router.get("/list")
async def list_simulations(db: Session = Depends(get_db)):
    """
    Lista todas las simulaciones
    """
    simulations = db.query(SimulationResult).order_by(
        SimulationResult.created_at.desc()
    ).limit(50).all()
    
    return {
        "total": len(simulations),
        "simulations": [
            {
                "id": s.id,
                "name": s.simulation_name,
                "status": s.status,
                "created_at": s.created_at,
            }
            for s in simulations
        ]
    }
