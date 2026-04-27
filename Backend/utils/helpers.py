"""
Utilidades genéricas para la API TIC2
"""

from fastapi.responses import JSONResponse
from fastapi import status
import logging

logger = logging.getLogger(__name__)

def error_response(message: str, status_code: int = 400, details: dict = None):
    """
    Genera una respuesta de error estandarizada
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "error",
            "message": message,
            "details": details or {}
        }
    )

def success_response(data: dict, message: str = "Success", status_code: int = 200):
    """
    Genera una respuesta de éxito estandarizada
    """
    response = {
        "status": "success",
        "message": message,
        **data
    }
    return JSONResponse(status_code=status_code, content=response)

def log_endpoint_access(endpoint: str, method: str, user_ip: str = None):
    """
    Registra acceso a endpoints
    """
    logger.info(f"[API] {method} {endpoint}" + (f" from {user_ip}" if user_ip else ""))

def validate_coordinates(coordinates: list, expected_points: int = 4) -> bool:
    """
    Valida que las coordenadas cumplan con los requisitos
    """
    if not isinstance(coordinates, list):
        return False
    
    if len(coordinates) != expected_points:
        return False
    
    for point in coordinates:
        if not isinstance(point, list) or len(point) != 2:
            return False
        if not all(isinstance(x, (int, float)) for x in point):
            return False
    
    return True

class PerformanceMetrics:
    """
    Clase para registrar métricas de performance
    """
    
    def __init__(self):
        self.detections_processed = 0
        self.rois_created = 0
        self.total_api_calls = 0
    
    def increment_detections(self):
        self.detections_processed += 1
    
    def increment_rois(self):
        self.rois_created += 1
    
    def increment_api_calls(self):
        self.total_api_calls += 1
    
    def get_stats(self):
        return {
            "detections_processed": self.detections_processed,
            "rois_created": self.rois_created,
            "total_api_calls": self.total_api_calls,
        }

# Instancia global de métricas
metrics = PerformanceMetrics()
