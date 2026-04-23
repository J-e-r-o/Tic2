"""
capturar.py  —  Captura periódica + inferencia YOLOv8n + payload JSON
----------------------------------------------------------------------
Ciclo completo del módulo edge:
  1. Captura un frame (cámara o archivo de prueba).
  2. Clasifica las plazas con detectar.py (YOLOv8n + IoU + voto temporal).
  3. Construye el payload JSON y lo guarda en captures/.
  4. (TODO Sprint 6) Envía el payload al Cloud Receptor vía HTTP.

Modos de uso:
    python capturar.py                        → bucle cada 5 min con cámara real (Pi)
    python capturar.py on_demand              → una sola foto con cámara real (Pi)
    python capturar.py scheduled foto.jpg     → bucle cada 5 min con imagen estática (PC)
    python capturar.py on_demand foto.jpg     → una sola foto con imagen estática (PC)
"""

import cv2
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# ── Importar el clasificador YOLO ────────────────────────────────────────────
try:
    from ultralytics import YOLO
except ImportError:
    raise SystemExit("Falta ultralytics. Instalá con:\n    pip install ultralytics")

from detectar import (
    cargar_rois,
    clasificar,
    VotoTemporal,
    VOTOS_HISTORY,
    MODEL_PATH,
)

# ── Configuración ─────────────────────────────────────────────────────────────
OUTPUT_DIR       = Path("captures")
OUTPUT_DIR.mkdir(exist_ok=True)
INTERVALO_SEG    = 5 * 60   # 5 minutos entre capturas en modo scheduled

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("edge.log"),
        logging.StreamHandler(sys.stdout),
    ],
)

# Instancias globales (se cargan una sola vez y se reutilizan en el bucle)
_model:   YOLO | None = None
_votador: VotoTemporal | None = None
_rois:    list | None = None


def _init_globals():
    global _model, _votador, _rois
    if _model is None:
        logging.info("Cargando modelo YOLOv8n…")
        _rois    = cargar_rois()
        _model   = YOLO(MODEL_PATH)
        _votador = VotoTemporal([str(r["spot_id"]) for r in _rois])
        logging.info(f"Modelo cargado. ROIs: {len(_rois)}")


# ── Captura ───────────────────────────────────────────────────────────────────

def capturar_frame(imagen_prueba: str | None = None):
    """Devuelve (ok, frame). Usa imagen_prueba si se especifica, si no abre la cámara."""
    if imagen_prueba:
        frame = cv2.imread(imagen_prueba)
        if frame is None:
            logging.error(f"No se pudo abrir imagen de prueba: {imagen_prueba}")
            return False, None
        return True, frame

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        logging.error("No se pudo abrir la cámara")
        return False, None
    ret, frame = cap.read()
    cap.release()
    if not ret:
        logging.error("No se pudo leer el frame")
        return False, None
    return True, frame


# ── Payload ───────────────────────────────────────────────────────────────────

def build_payload(spots: list[dict], image_filename: str, trigger: str) -> dict:
    free          = sum(1 for s in spots if s["estado"] == "free")
    occupied      = sum(1 for s in spots if s["estado"] == "occupied")
    free_disc     = sum(1 for s in spots if s["estado"] == "free"     and s["tipo"] == "discapacitado")
    occupied_disc = sum(1 for s in spots if s["estado"] == "occupied" and s["tipo"] == "discapacitado")

    spots_payload = [
        {
            "spot_id":       s["spot_id"],
            "status":        s["estado"],
            "discapacitado": s["tipo"] == "discapacitado",
            "iou_max":       s.get("densidad", 0),
        }
        for s in spots
    ]

    return {
        "captured_at":            datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "total_spots":            len(spots),
        "free_spots":             free,
        "occupied_spots":         occupied,
        "free_discapacitado":     free_disc,
        "occupied_discapacitado": occupied_disc,
        "spots":                  spots_payload,
        "image_filename":         image_filename,
        "trigger":                trigger,
    }


# ── Una captura completa ──────────────────────────────────────────────────────

def una_captura(trigger: str, imagen_prueba: str | None = None) -> bool:
    """
    Ejecuta un ciclo completo: captura → inferencia → guarda JSON.
    Devuelve True si tuvo éxito, False si falló.
    """
    logging.info(f"Capturando — trigger={trigger}")

    ok, frame = capturar_frame(imagen_prueba)
    if not ok:
        return False

    # Guardar imagen
    timestamp      = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    image_filename = f"{timestamp}.jpg"
    image_path     = OUTPUT_DIR / image_filename
    cv2.imwrite(str(image_path), frame)
    logging.info(f"Imagen guardada: {image_path}")

    # Inferencia (3 pasadas para estabilizar el voto temporal)
    for _ in range(VOTOS_HISTORY):
        spots = clasificar(frame, _rois, _model, _votador)

    # Guardar payload
    payload      = build_payload(spots, image_filename, trigger)
    payload_path = OUTPUT_DIR / f"{timestamp}.json"
    with open(payload_path, "w") as f:
        json.dump(payload, f, indent=2)

    logging.info(
        f"Payload guardado: {payload_path} | "
        f"{payload['free_spots']} libres / {payload['occupied_spots']} ocupadas"
    )

    # TODO Sprint 6: enviar payload al Cloud Receptor
    # enviar_al_cloud(payload, image_path)

    return True


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    trigger       = sys.argv[1] if len(sys.argv) > 1 else "scheduled"
    imagen_prueba = sys.argv[2] if len(sys.argv) > 2 else None

    _init_globals()

    if trigger == "on_demand":
        # Una sola foto y termina
        ok = una_captura("on_demand", imagen_prueba)
        sys.exit(0 if ok else 1)

    else:
        # Bucle cada INTERVALO_SEG segundos — Ctrl+C para detener
        logging.info(f"Modo scheduled — captura cada {INTERVALO_SEG // 60} minutos. Ctrl+C para detener.")
        while True:
            try:
                una_captura("scheduled", imagen_prueba)
                logging.info(f"Próxima captura en {INTERVALO_SEG // 60} minutos…")
                time.sleep(INTERVALO_SEG)
            except KeyboardInterrupt:
                logging.info("Detenido por el usuario.")
                break
            except Exception as e:
                # Si algo falla (ej. cámara desconectada), loguea y reintenta en el próximo ciclo
                logging.error(f"Error en captura: {e}. Reintentando en {INTERVALO_SEG // 60} minutos…")
                time.sleep(INTERVALO_SEG)


if __name__ == "__main__":
    main()