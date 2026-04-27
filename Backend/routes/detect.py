from fastapi import APIRouter, UploadFile, File, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Detection, ROI
import boto3
from config import settings
from datetime import datetime
import json
from utils.detector import clasificar_plazas, extraer_datos_roi
from utils.image_processor import procesar_imagen_opencv, ajustar_tamaño_imagen
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/detect", tags=["detection"])

# Initialize S3 client
s3_client = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION,
)

@router.post("/upload-and-detect")
async def upload_and_detect(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Sube una imagen a S3 y detecta plazas ocupadas/libres usando OpenCV
    Procesa la imagen con los ROIs guardados en la base de datos
    """
    try:
        # Leer contenido del archivo
        contents = await file.read()
        
        # Procesar imagen con OpenCV
        frame = procesar_imagen_opencv(contents)
        if frame is None:
            return {"status": "error", "message": "No se pudo procesar la imagen"}
        
        # Ajustar tamaño si es muy grande
        frame = ajustar_tamaño_imagen(frame)
        
        # Obtener ROIs de la base de datos
        rois_db = db.query(ROI).all()
        
        if not rois_db:
            return {
                "status": "warning",
                "message": "No hay ROIs definidas",
                "detection_id": None
            }
        
        # Convertir ROIs de BD a formato compatible con detector
        rois_list = []
        for roi in rois_db:
            try:
                coordinates = json.loads(roi.coordinates)
                rois_list.append({
                    "spot_id": roi.id,
                    "tipo": roi.description or "normal",
                    "points": coordinates
                })
            except json.JSONDecodeError:
                continue
        
        # Ejecutar detección
        resultados = clasificar_plazas(frame, rois_list)
        
        # Generar clave S3 con timestamp
        timestamp = datetime.now().isoformat()
        s3_key = f"detections/{timestamp}_{file.filename}"
        
        # Subir imagen original a S3
        s3_client.put_object(
            Bucket=settings.S3_BUCKET,
            Key=s3_key,
            Body=contents,
            ContentType=file.content_type,
        )
        
        # Generar URL de S3
        s3_url = f"https://{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
        
        # Guardar detección en RDS
        # Contar plazas libres/ocupadas
        free_count = sum(1 for r in resultados if r["estado"] == "free")
        occupied_count = sum(1 for r in resultados if r["estado"] == "occupied")
        confidence = (free_count + occupied_count) * 100 / len(resultados) if resultados else 0
        
        detection = Detection(
            image_key=s3_key,
            confidence=round(confidence, 2),
            object_type="parking_detection",
            coordinates=json.dumps({
                "total_spots": len(resultados),
                "free": free_count,
                "occupied": occupied_count,
                "details": resultados
            }),
            s3_url=s3_url,
        )
        
        db.add(detection)
        db.commit()
        db.refresh(detection)
        
        return {
            "status": "success",
            "detection_id": detection.id,
            "s3_url": s3_url,
            "timestamp": timestamp,
            "total_spots": len(resultados),
            "free_spots": free_count,
            "occupied_spots": occupied_count,
            "confidence": confidence,
            "details": resultados
        }
    
    except Exception as e:
        logger.error(f"Error en detección: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.get("/history")
async def get_detection_history(db: Session = Depends(get_db), limit: int = Query(100, le=500)):
    """
    Obtiene el historial de detecciones
    """
    try:
        detections = db.query(Detection).order_by(Detection.timestamp.desc()).limit(limit).all()
        
        parsed_detections = []
        for d in detections:
            try:
                coords = json.loads(d.coordinates)
            except:
                coords = {}
            
            parsed_detections.append({
                "id": d.id,
                "timestamp": d.timestamp.isoformat() if d.timestamp else None,
                "confidence": d.confidence,
                "object_type": d.object_type,
                "s3_url": d.s3_url,
                "summary": coords.get("details", []) if coords else []
            })
        
        return {
            "status": "success",
            "total": len(parsed_detections),
            "detections": parsed_detections
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/{detection_id}")
async def get_detection(detection_id: int, db: Session = Depends(get_db)):
    """
    Obtiene detalles completos de una detección específica
    """
    try:
        detection = db.query(Detection).filter(Detection.id == detection_id).first()
        
        if not detection:
            return {"status": "error", "message": "Detección no encontrada"}
        
        try:
            coords = json.loads(detection.coordinates)
        except:
            coords = {}
        
        return {
            "status": "success",
            "id": detection.id,
            "timestamp": detection.timestamp.isoformat() if detection.timestamp else None,
            "confidence": detection.confidence,
            "object_type": detection.object_type,
            "s3_url": detection.s3_url,
            "details": coords
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
