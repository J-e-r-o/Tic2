from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import ROI
from pydantic import BaseModel
from typing import List, Optional
import json
from utils.detector import validar_roi
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rois", tags=["rois"])

class ROICreate(BaseModel):
    """Modelo para crear una ROI"""
    name: str
    description: Optional[str] = "normal"  # "normal" o "discapacitado"
    coordinates: List[List[int]]  # Debe ser una lista de 4 puntos [x, y]
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Plaza 1",
                "description": "normal",
                "coordinates": [[100, 100], [200, 100], [200, 200], [100, 200]]
            }
        }

class ROIResponse(BaseModel):
    """Modelo para respuesta de ROI"""
    id: int
    name: str
    description: str
    coordinates: str  # JSON string
    created_at: str
    
    class Config:
        from_attributes = True

@router.post("/create", response_model=ROIResponse)
async def create_roi(roi: ROICreate, db: Session = Depends(get_db)):
    """
    Crea una nueva región de interés (plaza de estacionamiento)
    
    Parameters:
    - name: Identificador de la plaza (ej: "Plaza 1")
    - description: Tipo de plaza ("normal" o "discapacitado")
    - coordinates: Exactamente 4 puntos [x, y] que definen el polígono
    """
    try:
        # Validar que haya exactamente 4 puntos
        if len(roi.coordinates) != 4:
            raise HTTPException(status_code=400, detail="Debe proporcionar exactamente 4 puntos")
        
        # Validar que cada punto sea válido [int, int]
        for point in roi.coordinates:
            if not isinstance(point, list) or len(point) != 2:
                raise HTTPException(status_code=400, detail="Cada punto debe ser [x, y]")
        
        # Validar tipo de plaza
        if roi.description not in ["normal", "discapacitado"]:
            raise HTTPException(status_code=400, detail="Tipo debe ser 'normal' o 'discapacitado'")
        
        # Convertir coordenadas a JSON
        coordinates_json = json.dumps(roi.coordinates)
        
        # Crear ROI
        new_roi = ROI(
            name=roi.name,
            description=roi.description,
            coordinates=coordinates_json,
        )
        
        db.add(new_roi)
        db.commit()
        db.refresh(new_roi)
        
        logger.info(f"ROI creada: {new_roi.id} - {roi.name}")
        
        # Convertir a respuesta con created_at como string
        return ROIResponse(
            id=new_roi.id,
            name=new_roi.name,
            description=new_roi.description,
            coordinates=new_roi.coordinates,
            created_at=new_roi.created_at.isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando ROI: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=List[dict])
async def list_rois(db: Session = Depends(get_db)):
    """
    Lista todas las ROIs guardadas en la base de datos
    """
    try:
        rois = db.query(ROI).all()
        
        result = []
        for roi in rois:
            try:
                coords = json.loads(roi.coordinates)
            except:
                coords = []
            
            result.append({
                "id": roi.id,
                "name": roi.name,
                "description": roi.description,
                "coordinates": coords,
                "created_at": roi.created_at.isoformat() if roi.created_at else None,
                "updated_at": roi.updated_at.isoformat() if roi.updated_at else None,
            })
        
        return result
    except Exception as e:
        logger.error(f"Error listando ROIs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{roi_id}")
async def get_roi(roi_id: int, db: Session = Depends(get_db)):
    """
    Obtiene una ROI específica por ID
    """
    try:
        roi = db.query(ROI).filter(ROI.id == roi_id).first()
        
        if not roi:
            raise HTTPException(status_code=404, detail="ROI no encontrada")
        
        try:
            coords = json.loads(roi.coordinates)
        except:
            coords = []
        
        return {
            "id": roi.id,
            "name": roi.name,
            "description": roi.description,
            "coordinates": coords,
            "created_at": roi.created_at.isoformat() if roi.created_at else None,
            "updated_at": roi.updated_at.isoformat() if roi.updated_at else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo ROI {roi_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{roi_id}")
async def update_roi(roi_id: int, roi_data: ROICreate, db: Session = Depends(get_db)):
    """
    Actualiza una ROI existente
    """
    try:
        roi = db.query(ROI).filter(ROI.id == roi_id).first()
        
        if not roi:
            raise HTTPException(status_code=404, detail="ROI no encontrada")
        
        # Validar coordenadas
        if len(roi_data.coordinates) != 4:
            raise HTTPException(status_code=400, detail="Debe proporcionar exactamente 4 puntos")
        
        # Actualizar campos
        roi.name = roi_data.name
        roi.description = roi_data.description
        roi.coordinates = json.dumps(roi_data.coordinates)
        
        db.commit()
        db.refresh(roi)
        
        logger.info(f"ROI actualizada: {roi.id}")
        
        try:
            coords = json.loads(roi.coordinates)
        except:
            coords = []
        
        return {
            "id": roi.id,
            "name": roi.name,
            "description": roi.description,
            "coordinates": coords,
            "created_at": roi.created_at.isoformat() if roi.created_at else None,
            "updated_at": roi.updated_at.isoformat() if roi.updated_at else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando ROI {roi_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{roi_id}")
async def delete_roi(roi_id: int, db: Session = Depends(get_db)):
    """
    Elimina una ROI específica
    """
    try:
        roi = db.query(ROI).filter(ROI.id == roi_id).first()
        
        if not roi:
            raise HTTPException(status_code=404, detail="ROI no encontrada")
        
        db.delete(roi)
        db.commit()
        
        logger.info(f"ROI eliminada: {roi_id}")
        
        return {"status": "success", "message": f"ROI {roi_id} eliminada"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando ROI {roi_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/")
async def delete_all_rois(db: Session = Depends(get_db)):
    """
    ⚠️ Elimina TODAS las ROIs (use con cuidado)
    """
    try:
        count = db.query(ROI).delete()
        db.commit()
        
        logger.warning(f"Se eliminaron {count} ROIs")
        
        return {"status": "success", "message": f"{count} ROIs eliminadas"}
    except Exception as e:
        logger.error(f"Error eliminando ROIs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
