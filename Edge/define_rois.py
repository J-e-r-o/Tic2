"""
define_rois.py  —  Herramienta interactiva para marcar plazas de parking
------------------------------------------------------------------------
Abre una imagen y permite dibujar polígonos (4 puntos) sobre cada plaza.
Guarda el resultado en rois.json.

Controles:
    Click izquierdo  →  añadir punto al polígono actual
    D                →  deshacer el último punto
    ENTER / SPACE    →  confirmar plaza (mínimo 3 puntos)
    C                →  cancelar la plaza actual
    T                →  marcar la última plaza confirmada como "discapacitado"
    Z                →  deshacer la última plaza confirmada
    Q / ESC          →  guardar y salir

Uso:
    python define_rois.py ../../fotos/foto1.jpeg
    python define_rois.py                         # abre webcam y congela un frame
"""

import cv2
import json
import sys
import numpy as np
from pathlib import Path

ROIS_FILE = Path("rois.json")

# ── Estado global de la herramienta ──────────────────────────────────────────
rois_confirmados: list[dict] = []   # [{spot_id, tipo, points}, ...]
puntos_actuales:  list       = []   # puntos del polígono en construcción
siguiente_id: int = 1

IMG_NOMBRE = ""
img_base:   np.ndarray | None = None   # imagen limpia (sin dibujos)


# ── Colores ───────────────────────────────────────────────────────────────────
COLOR_CONFIRMADO   = (0, 220, 0)
COLOR_DISCAPACIDAD = (220, 180, 0)
COLOR_EN_PROGRESO  = (0, 180, 255)
COLOR_PUNTO        = (0, 0, 255)


# ── Redibujado ────────────────────────────────────────────────────────────────

def redibujar(ventana: str):
    img = img_base.copy()

    # Plazas confirmadas
    for roi in rois_confirmados:
        pts   = np.array(roi["points"], np.int32)
        color = COLOR_DISCAPACIDAD if roi.get("tipo", "normal") == "discapacitado" else COLOR_CONFIRMADO
        cv2.polylines(img, [pts], True, color, 2)
        cx = sum(p[0] for p in roi["points"]) // len(roi["points"])
        cy = sum(p[1] for p in roi["points"]) // len(roi["points"])
        label = str(roi["spot_id"])
        if roi.get("tipo", "normal") == "discapacitado":
            label += " [D]"
        cv2.putText(img, label, (cx - 8, cy + 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

    # Polígono en construcción
    for i, pt in enumerate(puntos_actuales):
        cv2.circle(img, pt, 5, COLOR_PUNTO, -1)
        if i > 0:
            cv2.line(img, puntos_actuales[i - 1], pt, COLOR_EN_PROGRESO, 1)

    # Cerrar el polígono en progreso visualmente
    if len(puntos_actuales) >= 3:
        cv2.line(img, puntos_actuales[-1], puntos_actuales[0], COLOR_EN_PROGRESO, 1)

    # HUD
    total = len(rois_confirmados)
    disc  = sum(1 for r in rois_confirmados if r.get("tipo", "normal") == "discapacitado")
    hud   = (
        f"Plazas: {total}  (disc: {disc})  |  "
        f"Puntos actuales: {len(puntos_actuales)}  |  "
        f"ENTER=confirmar  T=discap  Z=deshacer  Q=guardar"
    )
    cv2.rectangle(img, (0, 0), (img.shape[1], 28), (0, 0, 0), -1)
    cv2.putText(img, hud, (6, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 1)

    cv2.imshow(ventana, img)


# ── Callback de mouse ─────────────────────────────────────────────────────────

def on_mouse(event, x, y, flags, ventana):
    if event == cv2.EVENT_LBUTTONDOWN:
        puntos_actuales.append((x, y))
        redibujar(ventana)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    global img_base, siguiente_id, IMG_NOMBRE

    # Obtener imagen
    if len(sys.argv) > 1:
        IMG_NOMBRE = sys.argv[1]
        img_base   = cv2.imread(IMG_NOMBRE)
        if img_base is None:
            raise SystemExit(f"No se pudo abrir: {IMG_NOMBRE}")
    else:
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            raise SystemExit("No se pudo abrir la cámara")
        print("Cámara abierta. Presioná ESPACIO para congelar el frame.")
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            cv2.imshow("Captura (ESPACIO para congelar)", frame)
            if cv2.waitKey(1) & 0xFF == ord(' '):
                img_base = frame.copy()
                break
        cap.release()
        cv2.destroyAllWindows()
        IMG_NOMBRE = "webcam_snapshot"

    # Cargar ROIs previos si existen
    if ROIS_FILE.exists():
        with open(ROIS_FILE) as f:
            rois_confirmados.extend(json.load(f))
        if rois_confirmados:
            siguiente_id = max(r["spot_id"] for r in rois_confirmados) + 1
        print(f"ROIs previos cargados: {len(rois_confirmados)}")

    VENTANA = "define_rois — click para marcar puntos"
    cv2.namedWindow(VENTANA, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(VENTANA, 1200, 700)
    cv2.setMouseCallback(VENTANA, on_mouse, VENTANA)

    redibujar(VENTANA)
    print(__doc__)

    while True:
        key = cv2.waitKey(50) & 0xFF

        if key in (13, 32):  # ENTER o ESPACIO — confirmar plaza
            if len(puntos_actuales) >= 3:
                rois_confirmados.append({
                    "spot_id": siguiente_id,
                    "tipo":    "normal",
                    "points":  list(puntos_actuales),
                })
                print(f"  Plaza {siguiente_id} confirmada ({len(puntos_actuales)} puntos)")
                siguiente_id += 1
                puntos_actuales.clear()
                redibujar(VENTANA)
            else:
                print("  Necesitás al menos 3 puntos para confirmar una plaza.")

        elif key == ord('d'):  # deshacer último punto
            if puntos_actuales:
                puntos_actuales.pop()
                redibujar(VENTANA)

        elif key == ord('c'):  # cancelar plaza actual
            puntos_actuales.clear()
            redibujar(VENTANA)

        elif key == ord('t'):  # toggle discapacitado en la última plaza
            if rois_confirmados:
                last = rois_confirmados[-1]
                last["tipo"] = "normal" if last.get("tipo", "normal") == "discapacitado" else "discapacitado"
                print(f"  Plaza {last['spot_id']} → tipo={last['tipo']}")
                redibujar(VENTANA)

        elif key == ord('z'):  # deshacer última plaza confirmada
            if rois_confirmados:
                removed = rois_confirmados.pop()
                siguiente_id = removed["spot_id"]
                print(f"  Plaza {removed['spot_id']} eliminada")
                redibujar(VENTANA)

        elif key in (ord('q'), 27):  # Q o ESC — guardar y salir
            break

        if cv2.getWindowProperty(VENTANA, cv2.WND_PROP_VISIBLE) < 1:
            break

    cv2.destroyAllWindows()

    # Guardar
    with open(ROIS_FILE, "w") as f:
        json.dump(rois_confirmados, f, indent=2)
    print(f"\nGuardado: {ROIS_FILE}  ({len(rois_confirmados)} plazas)")


if __name__ == "__main__":
    main()