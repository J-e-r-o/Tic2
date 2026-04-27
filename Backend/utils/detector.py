import cv2
import json
import numpy as np
from pathlib import Path
from typing import List, Dict, Any

UMBRAL_BORDES = 0.05  # ajustable según sensibilidad

def crear_mascara(shape, points):
    """Crea una máscara para una región poligonal"""
    mask = np.zeros(shape[:2], dtype=np.uint8)
    pts = np.array(points, dtype=np.int32)
    cv2.fillPoly(mask, [pts], 255)
    return mask

def clasificar_plazas(frame: np.ndarray, rois: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Clasifica plazas de estacionamiento en ocupadas/libres basado en detección de bordes
    
    Args:
        frame: Imagen en formato BGR (numpy array)
        rois: Lista de diccionarios con ROIs, cada uno con 'spot_id', 'tipo' y 'points'
    
    Returns:
        Lista de resultados con estado de cada plaza
    """
    gris = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    bordes = cv2.Canny(gris, 50, 150)

    resultados = []
    for roi in rois:
        mask = crear_mascara(frame.shape, roi["points"])
        total_pixels = np.sum(mask > 0)
        pixels_borde = np.sum((bordes > 0) & (mask > 0))
        densidad = pixels_borde / total_pixels if total_pixels > 0 else 0
        estado = "occupied" if densidad > UMBRAL_BORDES else "free"
        
        resultados.append({
            "spot_id": roi["spot_id"],
            "tipo": roi["tipo"],
            "estado": estado,
            "densidad": round(densidad, 4),
            "confianza": round(abs(densidad - UMBRAL_BORDES) * 100, 2)
        })
    
    return resultados

def visualizar_resultados(frame: np.ndarray, rois: List[Dict], resultados: List[Dict]) -> np.ndarray:
    """
    Visualiza los resultados en la imagen (para desarrollo/testing)
    
    Returns:
        Imagen con anotaciones
    """
    img = frame.copy()
    COLORS = {
        ("free", "normal"):         (0, 255, 0),    # verde
        ("occupied", "normal"):     (0, 0, 255),    # rojo
        ("free", "discapacitado"):  (255, 200, 0),  # azul claro
        ("occupied", "discapacitado"): (0, 0, 180), # azul oscuro
    }
    
    for roi, res in zip(rois, resultados):
        pts = np.array(roi["points"], np.int32)
        color = COLORS.get((res["estado"], roi["tipo"]), (255, 255, 255))
        cv2.polylines(img, [pts], True, color, 2)
        
        # Calcular centro del polígono
        cx = int(sum(p[0] for p in roi["points"]) / len(roi["points"]))
        cy = int(sum(p[1] for p in roi["points"]) / len(roi["points"]))
        
        label = f"{res['spot_id']} {'L' if res['estado'] == 'free' else 'O'}"
        cv2.putText(img, label, (cx - 10, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    
    return img

def extraer_datos_roi(rois_json: str) -> List[Dict[str, Any]]:
    """
    Parsea JSON de ROIs
    
    Args:
        rois_json: String JSON con formato [{"spot_id": 1, "tipo": "normal", "points": [[x,y], ...]}]
    
    Returns:
        Lista de ROIs parseadas
    """
    try:
        rois = json.loads(rois_json)
        return rois
    except json.JSONDecodeError:
        return []

def validar_roi(roi: Dict) -> bool:
    """Valida que un ROI tenga el formato correcto"""
    required_keys = ["spot_id", "tipo", "points"]
    if not all(k in roi for k in required_keys):
        return False
    
    if not isinstance(roi["points"], list) or len(roi["points"]) != 4:
        return False
    
    if roi["tipo"] not in ["normal", "discapacitado"]:
        return False
    
    return True
