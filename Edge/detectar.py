import cv2
import json
import numpy as np
from pathlib import Path

ROIS_FILE = Path("rois.json")
UMBRAL_BORDES = 0.05  # ajustable

def cargar_rois():
    with open(ROIS_FILE) as f:
        return json.load(f)

def crear_mascara(shape, points):
    mask = np.zeros(shape[:2], dtype=np.uint8)
    pts = np.array(points, dtype=np.int32)
    cv2.fillPoly(mask, [pts], 255)
    return mask

def clasificar(frame, rois):
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
        })
        print(f"Plaza {roi['spot_id']} ({roi['tipo']}): {estado} — densidad bordes: {densidad:.4f}")
    return resultados

def visualizar(frame, rois, resultados):
    img = frame.copy()
    COLORS = {
        ("free", "normal"):         (0, 255, 0),    # verde
        ("occupied", "normal"):     (0, 0, 255),    # rojo
        ("free", "discapacitado"):  (255, 200, 0),  # azul claro
        ("occupied", "discapacitado"): (0, 0, 180), # azul oscuro
    }
    for roi, res in zip(rois, resultados):
        pts = np.array(roi["points"], np.int32)
        color = COLORS[(res["estado"], roi["tipo"])]
        cv2.polylines(img, [pts], True, color, 2)
        cx = sum(p[0] for p in roi["points"]) // 4
        cy = sum(p[1] for p in roi["points"]) // 4
        label = f"{res['spot_id']} {'L' if res['estado'] == 'free' else 'O'}"
        cv2.putText(img, label, (cx - 10, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    cv2.namedWindow("Deteccion", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Deteccion", 1200, 700)
    cv2.imshow("Deteccion", img)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

if __name__ == "__main__":
    frame = cv2.imread("fotos/WhatsApp Image 2026-04-06 at 19.20.13.jpeg")
    rois = cargar_rois()
    resultados = clasificar(frame, rois)
    visualizar(frame, rois, resultados)