import cv2
import json
import numpy as np
from pathlib import Path
from typing import List, Dict, Any

# ── Configuración ────────────────────────────────────────────────────────────
MODEL_PATH   = Path(__file__).parent.parent / "yolov8n.pt"
UMBRAL_IOU   = 0.15   # umbral bajo: autos a 45° tienen IoU chico
CONF_MINIMA  = 0.30

CLASES_VEHICULO = {2, 3, 5, 7}  # car, motorcycle, bus, truck (COCO)

# Singleton del modelo — se carga una sola vez en el primer request
_model = None

def _get_model():
    global _model
    if _model is None:
        from ultralytics import YOLO
        _model = YOLO(str(MODEL_PATH))
    return _model


# ── Helpers de geometría ─────────────────────────────────────────────────────

def _bbox_de_roi(points: list) -> tuple:
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return min(xs), min(ys), max(xs), max(ys)


def _iou(a: tuple, b: tuple) -> float:
    xA, yA = max(a[0], b[0]), max(a[1], b[1])
    xB, yB = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, xB - xA) * max(0, yB - yA)
    if inter == 0:
        return 0.0
    areaA = (a[2] - a[0]) * (a[3] - a[1])
    areaB = (b[2] - b[0]) * (b[3] - b[1])
    return inter / (areaA + areaB - inter)


def _center_en_roi(cx: float, cy: float, points: list) -> bool:
    pts = np.array(points, dtype=np.int32)
    return cv2.pointPolygonTest(pts, (cx, cy), False) >= 0


# ── Normalización de tipo ────────────────────────────────────────────────────

def normalize_tipo(tipo: str) -> str:
    if tipo == 'normal':
        return 'estandar'
    if tipo == 'discapacitado':
        return 'accesible'
    return tipo or 'estandar'


# ── Detección principal ──────────────────────────────────────────────────────

def clasificar_plazas(frame: np.ndarray, rois: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Clasifica plazas usando YOLOv8n + IoU entre bounding boxes de vehículos y ROIs.

    Args:
        frame: imagen BGR (numpy array)
        rois:  lista de dicts con 'spot_id', 'tipo', 'points'

    Returns:
        lista de resultados con estado de cada plaza
    """
    model = _get_model()
    results = model(frame, verbose=False, conf=CONF_MINIMA)[0]

    # Filtrar solo vehículos
    vehicle_boxes = []
    for box in results.boxes:
        if int(box.cls[0]) in CLASES_VEHICULO:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            vehicle_boxes.append((x1, y1, x2, y2))

    roi_boxes = [_bbox_de_roi(roi["points"]) for roi in rois]

    # Asignación exclusiva: cada vehículo va al ROI con mayor IoU
    iou_asignado = [0.0] * len(rois)
    for vbox in vehicle_boxes:
        cx = (vbox[0] + vbox[2]) / 2
        cy = (vbox[1] + vbox[3]) / 2

        scores = []
        for i, (roi, rbox) in enumerate(zip(rois, roi_boxes)):
            score = _iou(rbox, vbox)
            if _center_en_roi(cx, cy, roi["points"]):
                score = max(score, UMBRAL_IOU + 0.01)
            scores.append(score)

        mejor = int(np.argmax(scores))
        if scores[mejor] >= UMBRAL_IOU and scores[mejor] > iou_asignado[mejor]:
            iou_asignado[mejor] = scores[mejor]

    resultados = []
    for i, roi in enumerate(rois):
        estado = "occupied" if iou_asignado[i] >= UMBRAL_IOU else "free"
        tipo   = normalize_tipo(roi.get("tipo", "estandar"))
        resultados.append({
            "spot_id":   roi["spot_id"],
            "tipo":      tipo,
            "estado":    estado,
            "densidad":  round(iou_asignado[i], 4),
            "confianza": round(abs(iou_asignado[i] - UMBRAL_IOU) * 100, 2),
        })

    return resultados


# ── Visualización (desarrollo/testing) ──────────────────────────────────────

def visualizar_resultados(frame: np.ndarray, rois: List[Dict], resultados: List[Dict]) -> np.ndarray:
    img = frame.copy()
    COLORS = {
        ("free",     "estandar"):  (0, 255, 0),
        ("occupied", "estandar"):  (0, 0, 255),
        ("free",     "accesible"): (255, 200, 0),
        ("occupied", "accesible"): (0, 0, 180),
    }

    for roi, res in zip(rois, resultados):
        pts   = np.array(roi["points"], np.int32)
        color = COLORS.get((res["estado"], res["tipo"]), (255, 255, 255))
        cv2.polylines(img, [pts], True, color, 2)
        cx = int(sum(p[0] for p in roi["points"]) / len(roi["points"]))
        cy = int(sum(p[1] for p in roi["points"]) / len(roi["points"]))
        label = f"{res['spot_id']} {'L' if res['estado'] == 'free' else 'O'}"
        cv2.putText(img, label, (cx - 10, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    return img


# ── Utilidades ───────────────────────────────────────────────────────────────

def extraer_datos_roi(rois_json: str) -> List[Dict[str, Any]]:
    try:
        return json.loads(rois_json)
    except json.JSONDecodeError:
        return []


def validar_roi(roi: Dict) -> bool:
    if not all(k in roi for k in ["spot_id", "tipo", "points"]):
        return False
    if not isinstance(roi["points"], list) or len(roi["points"]) != 4:
        return False
    if roi["tipo"] not in ["normal", "discapacitado", "estandar", "accesible"]:
        return False
    return True
