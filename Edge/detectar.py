"""
detectar.py  —  Clasificación de plazas con YOLOv8n + IoU sobre ROIs
---------------------------------------------------------------------
Approach A: modelo COCO preentrenado, sin reentrenamiento.
  1. YOLO detecta vehículos en el frame completo.
  2. Cada bounding box se cruza (IoU) contra los ROIs del JSON.
  3. Si IoU >= UMBRAL_IOU  →  plaza ocupada.
  4. Voto temporal 2-de-3: la plaza necesita 2 frames consecutivos
     iguales para cambiar de estado (evita parpadeo).

Dependencias:
    pip install ultralytics opencv-python numpy

Uso standalone:
    python detectar.py ../../fotos/foto1.jpeg
    python detectar.py          # abre webcam (índice 0)
"""

import cv2
import json
import numpy as np
from pathlib import Path
from collections import deque

# ── Intentar importar YOLO; dar mensaje claro si falta ──────────────────────
try:
    from ultralytics import YOLO
except ImportError:
    raise SystemExit(
        "Falta ultralytics. Instalá con:\n"
        "    pip install ultralytics"
    )

# ── Configuración ────────────────────────────────────────────────────────────
ROIS_FILE     = Path("rois.json")
MODEL_PATH    = "yolov8n.pt"          # se descarga automático la primera vez (~6 MB)
UMBRAL_IOU    = 0.15                  # umbral bajo: autos a 45° tienen IoU chico
CONF_MINIMA   = 0.30                  # ignorar detecciones con confianza < 0.30
VOTOS_HISTORY = 3                     # ventana del voto temporal
VOTOS_MINIMOS = 2                     # cuántos votos "occupied" para declarar ocupado

# Clases COCO que consideramos vehículo
CLASES_VEHICULO = {
    2:  "car",
    3:  "motorcycle",
    5:  "bus",
    7:  "truck",
}

# Colores de visualización  (B, G, R)
COLORS = {
    ("free",     "normal"):        (0, 200, 0),
    ("occupied", "normal"):        (0, 0, 220),
    ("free",     "discapacitado"): (200, 180, 0),
    ("occupied", "discapacitado"): (0, 0, 160),
}


# ── Helpers de geometría ─────────────────────────────────────────────────────

def bbox_de_roi(points: list) -> tuple:
    """Bounding box [x1,y1,x2,y2] del polígono del ROI."""
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return min(xs), min(ys), max(xs), max(ys)


def iou(boxA: tuple, boxB: tuple) -> float:
    """IoU entre dos bboxes (x1,y1,x2,y2)."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    inter = max(0, xB - xA) * max(0, yB - yA)
    if inter == 0:
        return 0.0
    areaA = (boxA[2]-boxA[0]) * (boxA[3]-boxA[1])
    areaB = (boxB[2]-boxB[0]) * (boxB[3]-boxB[1])
    return inter / (areaA + areaB - inter)


def center_en_roi(cx: float, cy: float, points: list) -> bool:
    """True si el centro del bbox cae dentro del polígono del ROI."""
    pts = np.array(points, dtype=np.int32)
    return cv2.pointPolygonTest(pts, (cx, cy), False) >= 0


# ── Carga ────────────────────────────────────────────────────────────────────

def cargar_rois() -> list[dict]:
    if not ROIS_FILE.exists():
        raise FileNotFoundError(f"No se encontró {ROIS_FILE}")
    with open(ROIS_FILE) as f:
        return json.load(f)


# ── Voto temporal ─────────────────────────────────────────────────────────────

class VotoTemporal:
    """
    Mantiene un historial de N frames por ROI y vota el estado final.
    Evita que un auto pasando cambie el estado de la plaza.
    """
    def __init__(self, roi_ids: list[str], history: int = VOTOS_HISTORY):
        self._historiales: dict[str, deque] = {
            rid: deque(maxlen=history) for rid in roi_ids
        }
        self._history = history

    def actualizar(self, rid: str, estado_raw: str):
        self._historiales[rid].append(estado_raw)

    def estado(self, rid: str) -> str:
        hist = self._historiales[rid]
        if not hist:
            return "free"
        ocupados = sum(1 for e in hist if e == "occupied")
        return "occupied" if ocupados >= VOTOS_MINIMOS else "free"


# ── Núcleo de clasificación ───────────────────────────────────────────────────

def clasificar(
    frame: np.ndarray,
    rois: list[dict],
    model: "YOLO",
    votador: VotoTemporal,
) -> list[dict]:
    """
    Corre YOLO sobre el frame, asigna cada bbox al ROI con mayor IoU
    (asignación exclusiva: un auto no puede ocupar dos plazas a la vez).
    """
    results = model(frame, verbose=False, conf=CONF_MINIMA)[0]

    # Filtrar solo vehículos
    vehicle_boxes = []
    for box in results.boxes:
        cls_id = int(box.cls[0])
        if cls_id in CLASES_VEHICULO:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            vehicle_boxes.append((x1, y1, x2, y2))

    # Precalcular bbox de cada ROI
    roi_boxes = [bbox_de_roi(roi["points"]) for roi in rois]

    # Para cada ROI, acumular el IoU máximo que le corresponde
    # tras asignación exclusiva de cada vehículo
    iou_asignado = [0.0] * len(rois)   # IoU ganador por ROI

    for vbox in vehicle_boxes:
        cx = (vbox[0] + vbox[2]) / 2
        cy = (vbox[1] + vbox[3]) / 2

        # Calcular IoU con todos los ROIs
        scores = []
        for i, (roi, rbox) in enumerate(zip(rois, roi_boxes)):
            i_val = iou(rbox, vbox)
            # Bonus si el centro cae dentro del polígono
            if center_en_roi(cx, cy, roi["points"]):
                i_val = max(i_val, UMBRAL_IOU + 0.01)
            scores.append(i_val)

        # Asignar SOLO al ROI con mayor score (si supera el umbral)
        mejor_idx = int(np.argmax(scores))
        if scores[mejor_idx] >= UMBRAL_IOU:
            # Solo actualizar si es mejor que lo ya asignado
            if scores[mejor_idx] > iou_asignado[mejor_idx]:
                iou_asignado[mejor_idx] = scores[mejor_idx]

    # Construir resultados y votar
    resultados = []
    for i, roi in enumerate(rois):
        rid          = str(roi["spot_id"])
        tipo         = roi.get("tipo", "normal")
        estado_raw   = "occupied" if iou_asignado[i] >= UMBRAL_IOU else "free"

        votador.actualizar(rid, estado_raw)
        estado_final = votador.estado(rid)

        resultados.append({
            "spot_id":  rid,
            "tipo":     tipo,
            "estado":   estado_final,
            "densidad": round(iou_asignado[i], 4),
        })

        print(
            f"Plaza {rid:>4} ({tipo:<13}) | "
            f"{'OCUPADO' if estado_final=='occupied' else 'libre  ':7} | "
            f"IoU={iou_asignado[i]:.3f}  umbral={UMBRAL_IOU}"
        )

    return resultados


# ── Visualización ─────────────────────────────────────────────────────────────

def visualizar(frame: np.ndarray, rois: list[dict], resultados: list[dict]):
    img = frame.copy()

    for roi, res in zip(rois, resultados):
        pts   = np.array(roi["points"], np.int32)
        color = COLORS.get((res["estado"], res["tipo"]), (128, 128, 128))

        # Polígono semitransparente
        overlay = img.copy()
        cv2.fillPoly(overlay, [pts], color)
        img = cv2.addWeighted(overlay, 0.25, img, 0.75, 0)

        # Borde
        cv2.polylines(img, [pts], True, color, 2)

        # Etiqueta
        cx = sum(p[0] for p in roi["points"]) // len(roi["points"])
        cy = sum(p[1] for p in roi["points"]) // len(roi["points"])
        label = f"{res['spot_id']} {'L' if res['estado']=='free' else 'O'}"
        if res["tipo"] == "discapacitado":
            label += " [D]"
        cv2.putText(img, label, (cx - 12, cy + 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

    # Contador general
    libres   = sum(1 for r in resultados if r["estado"] == "free")
    ocupadas = sum(1 for r in resultados if r["estado"] == "occupied")
    cv2.rectangle(img, (5, 5), (260, 45), (0, 0, 0), -1)
    cv2.putText(img, f"Libres: {libres}   Ocupadas: {ocupadas}",
                (10, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)

    cv2.namedWindow("Deteccion YOLOv8n", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Deteccion YOLOv8n", 1200, 700)
    cv2.imshow("Deteccion YOLOv8n", img)

    while True:
        key = cv2.waitKey(100) & 0xFF
        if key in (ord('q'), 27):
            break
        if cv2.getWindowProperty("Deteccion YOLOv8n", cv2.WND_PROP_VISIBLE) < 1:
            break
    cv2.destroyAllWindows()


# ── Main standalone ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    rois  = cargar_rois()
    model = YOLO(MODEL_PATH)

    ids     = [str(r["spot_id"]) for r in rois]
    votador = VotoTemporal(ids)

    if len(sys.argv) > 1:
        # Imagen estática
        frame = cv2.imread(sys.argv[1])
        if frame is None:
            raise SystemExit(f"No se pudo abrir la imagen: {sys.argv[1]}")
        # Un solo frame: rellenamos el historial 3 veces para que el voto sea estable
        for _ in range(VOTOS_HISTORY):
            resultados = clasificar(frame, rois, model, votador)
    else:
        # Webcam — útil para pruebas en vivo
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            raise SystemExit("No se pudo abrir la cámara")
        frame = None
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            resultados = clasificar(frame, rois, model, votador)
            # Vista rápida en tiempo real (sin blocking)
            img = frame.copy()
            libres   = sum(1 for r in resultados if r["estado"] == "free")
            ocupadas = sum(1 for r in resultados if r["estado"] == "occupied")
            cv2.putText(img, f"L:{libres} O:{ocupadas}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.imshow("Live", img)
            if cv2.waitKey(1) & 0xFF in (ord('q'), 27):
                break
        cap.release()
        cv2.destroyAllWindows()

    if frame is not None:
        visualizar(frame, rois, resultados)