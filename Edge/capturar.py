"""
capturar.py  —  Captura periódica + envío al backend
-----------------------------------------------------
La Pi solo captura fotos y las manda al backend.
El backend se encarga de YOLO, S3 y la base de datos.

Modos de uso:
    python capturar.py                    → bucle cada 5 min con cámara real (Pi)
    python capturar.py on_demand          → una sola foto con cámara real (Pi)
    python capturar.py scheduled foto.jpg → bucle cada 5 min con imagen estática (PC)
    python capturar.py on_demand foto.jpg → una sola foto con imagen estática (PC)
"""

import cv2
import logging
import sys
import time
import requests
from datetime import datetime, timezone
from pathlib import Path

# ── Configuración ─────────────────────────────────────────────────────────────
OUTPUT_DIR    = Path("captures")
OUTPUT_DIR.mkdir(exist_ok=True)
INTERVALO_SEG = 5 * 60  # 5 minutos entre capturas en modo scheduled
BACKEND_URL   = "https://dggcb6cfqc.execute-api.us-east-2.amazonaws.com"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("edge.log"),
        logging.StreamHandler(sys.stdout),
    ],
)


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


# ── Una captura completa ──────────────────────────────────────────────────────

def una_captura(trigger: str, imagen_prueba: str | None = None) -> bool:
    """Captura una foto y la manda al backend."""
    logging.info(f"Capturando — trigger={trigger}")

    ok, frame = capturar_frame(imagen_prueba)
    if not ok:
        return False

    # Guardar imagen localmente
    timestamp      = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    image_filename = f"{timestamp}.jpg"
    image_path     = OUTPUT_DIR / image_filename
    cv2.imwrite(str(image_path), frame)
    logging.info(f"Imagen guardada: {image_path}")

    # Enviar al backend — YOLO, S3 y BDD se manejan allá
    try:
        with open(image_path, 'rb') as img_file:
            response = requests.post(
                f"{BACKEND_URL}/api/detect/upload-and-detect",
                files={'file': (image_filename, img_file, 'image/jpeg')},
                timeout=60,
            )
        if response.status_code == 200:
            data = response.json()
            logging.info(f"Foto procesada — {data.get('free_spots')} libres / {data.get('occupied_spots')} ocupadas")
        else:
            logging.error(f"Error del backend: {response.status_code} {response.text}")
    except Exception as e:
        logging.error(f"No se pudo conectar al backend: {e}")

    return True


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    trigger       = sys.argv[1] if len(sys.argv) > 1 else "scheduled"
    imagen_prueba = sys.argv[2] if len(sys.argv) > 2 else None

    if trigger == "on_demand":
        ok = una_captura("on_demand", imagen_prueba)
        sys.exit(0 if ok else 1)

    else:
        logging.info(f"Modo scheduled — captura cada {INTERVALO_SEG // 60} min. Ctrl+C para detener.")
        ultimo_scheduled = 0
        while True:
            try:
                ahora = time.time()

                # Verificar comando on-demand del admin (polling cada 10 segundos)
                try:
                    resp = requests.get(f"{BACKEND_URL}/api/pi/command", timeout=5)
                    if resp.status_code == 200 and resp.json().get("command") == "capture":
                        logging.info("Comando on-demand recibido — capturando...")
                        una_captura("on_demand", imagen_prueba)
                except Exception as e:
                    logging.warning(f"Error verificando comando: {e}")

                # Captura periódica
                if ahora - ultimo_scheduled >= INTERVALO_SEG:
                    una_captura("scheduled", imagen_prueba)
                    ultimo_scheduled = ahora

                time.sleep(10)

            except KeyboardInterrupt:
                logging.info("Detenido por el usuario.")
                break
            except Exception as e:
                logging.error(f"Error inesperado: {e}")
                time.sleep(60)


if __name__ == "__main__":
    main()
