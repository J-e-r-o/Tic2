import cv2
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

# --- Configuración básica ---
TRIGGER = "scheduled"
OUTPUT_DIR = Path("captures")
OUTPUT_DIR.mkdir(exist_ok=True)
ROIS_FILE = Path("rois.json")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("edge.log"),
        logging.StreamHandler(sys.stdout),
    ]
)

# --- Cargar ROIs ---
def load_rois() -> list[dict]:
    if not ROIS_FILE.exists():
        logging.warning("rois.json no encontrado, classify_spots devolverá lista vacía")
        return []
    with open(ROIS_FILE) as f:
        return json.load(f)

# --- Captura ---
def capture() -> tuple[bool, any]:
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        logging.error("No se pudo abrir la cámara")
        return False, None
    ret, frame = cap.read()
    cap.release()
    if not ret:
        logging.error("No se pudo leer el frame de la cámara")
        return False, None
    return True, frame

# --- Clasificación de ROIs ---
def classify_spots(frame, rois: list[dict]) -> list[dict]:
    """
    Por ahora devuelve datos ficticios manteniendo la info real de cada ROI.
    En Sprint 4 esto aplica la heurística OpenCV sobre cada recorte.
    """
    spots = []
    for roi in rois:
        # TODO Sprint 4: recortar ROI con su máscara de polígono y aplicar heurística
        spots.append({
            "spot_id": f"A{roi['spot_id']:02d}",
            "status": "free",  # placeholder
            "discapacitado": roi["tipo"] == "discapacitado",
        })
    return spots

# --- Construcción del payload ---
def build_payload(spots: list[dict], image_filename: str, trigger: str) -> dict:
    free = sum(1 for s in spots if s["status"] == "free")
    occupied = sum(1 for s in spots if s["status"] == "occupied")
    free_discapacitado = sum(1 for s in spots if s["status"] == "free" and s["discapacitado"])
    occupied_discapacitado = sum(1 for s in spots if s["status"] == "occupied" and s["discapacitado"])
    return {
        "captured_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "total_spots": len(spots),
        "free_spots": free,
        "occupied_spots": occupied,
        "free_discapacitado": free_discapacitado,
        "occupied_discapacitado": occupied_discapacitado,
        "spots": spots,
        "image_filename": image_filename,
        "trigger": trigger,
    }

# --- Main ---
def main():
    trigger = sys.argv[1] if len(sys.argv) > 1 else TRIGGER

    logging.info(f"Iniciando captura — trigger={trigger}")

    ok, frame = capture()
    if not ok:
        sys.exit(1)

    # Guardar imagen
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    image_filename = f"{timestamp}.jpg"
    image_path = OUTPUT_DIR / image_filename
    cv2.imwrite(str(image_path), frame)
    logging.info(f"Imagen guardada: {image_path}")

    # Clasificar plazas
    rois = load_rois()
    spots = classify_spots(frame, rois)

    # Construir y guardar payload
    payload = build_payload(spots, image_filename, trigger)
    payload_path = OUTPUT_DIR / f"{timestamp}.json"
    with open(payload_path, "w") as f:
        json.dump(payload, f, indent=2)

    logging.info(f"Payload guardado: {payload_path}")
    logging.info(f"Resultado: {payload['free_spots']} libres / {payload['occupied_spots']} ocupadas")
    logging.info(f"Discapacitados: {payload['free_discapacitado']} libres / {payload['occupied_discapacitado']} ocupadas")

if __name__ == "__main__":
    main()
