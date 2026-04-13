import cv2
import json
import numpy as np
from pathlib import Path

current_points = []
current_type = "normal"
img_original = cv2.imread("fotos/WhatsApp Image 2026-04-06 at 19.20.13.jpeg")
img = img_original.copy()

# Cargar ROIs existentes si ya hay un archivo
if Path("rois.json").exists():
    with open("rois.json") as f:
        rois = json.load(f)
    print(f"Cargados {len(rois)} ROIs existentes")
else:
    rois = []

COLORS = {
    "normal": (0, 255, 0),
    "discapacitado": (255, 100, 0)
}

def redraw():
    global img
    img = img_original.copy()
    for r in rois:
        pts = np.array(r["points"], np.int32)
        color = COLORS[r["tipo"]]
        cv2.polylines(img, [pts], True, color, 2)
        cx = sum(p[0] for p in r["points"]) // 4
        cy = sum(p[1] for p in r["points"]) // 4
        label = f"{r['spot_id']}"
        if r["tipo"] == "discapacitado":
            label += " [D]"
        cv2.putText(img, label, (cx, cy),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    for p in current_points:
        cv2.circle(img, tuple(p), 5, COLORS[current_type], -1)
    if len(current_points) > 1:
        for i in range(len(current_points) - 1):
            cv2.line(img, tuple(current_points[i]), tuple(current_points[i+1]), COLORS[current_type], 1)

    # Indicador de modo actual
    letra = "D" if current_type == "discapacitado" else "N"
    color = COLORS[current_type]
    overlay = img.copy()
    cv2.rectangle(overlay, (10, 10), (40, 45), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.4, img, 0.6, 0, img)
    cv2.putText(img, letra, (16, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)

    cv2.imshow("ROI", img)

def click(event, x, y, flags, param):
    global current_points
    if event == cv2.EVENT_LBUTTONDOWN:
        current_points.append([x, y])
        redraw()
        print(f"  Punto {len(current_points)}/4: ({x}, {y})")

cv2.namedWindow("ROI", cv2.WINDOW_NORMAL)
cv2.resizeWindow("ROI", 1200, 700)
cv2.setMouseCallback("ROI", click)
redraw()

print("Click = agregar punto | Enter = confirmar plaza | Z = deshacer | N = modo normal | D = modo discapacitado | S = guardar")

while True:
    key = cv2.waitKey(1) & 0xFF

    if key == 13:  # Enter
        if len(current_points) == 4:
            rois.append({"spot_id": len(rois) + 1, "tipo": current_type, "points": current_points})
            print(f"Plaza {len(rois)} confirmada ({current_type})")
            current_points = []
            redraw()
        else:
            print(f"Necesitás exactamente 4 puntos (tenés {len(current_points)})")

    elif key == ord('z'):
        if current_points:
            current_points.pop()
            redraw()
            print("Último punto deshecho")
        elif rois:
            rois.pop()
            redraw()
            print("Última plaza deshecha")

    elif key == ord('n'):
        current_type = "normal"
        redraw()
        print("Modo: NORMAL")

    elif key == ord('d'):
        current_type = "discapacitado"
        redraw()
        print("Modo: DISCAPACITADO")

    elif key == ord('s'):
        if len(rois) == 0:
            print("No hay plazas guardadas todavía")
        else:
            with open("rois.json", "w") as f:
                json.dump(rois, f, indent=2)
            print(f"Guardados {len(rois)} ROIs en rois.json")
            break

cv2.destroyAllWindows()