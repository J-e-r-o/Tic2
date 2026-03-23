import cv2
import os
from datetime import datetime

# Obtener la ruta del script actual
base_dir = os.path.dirname(os.path.abspath(__file__))

# Ir a la carpeta "edge"
carpeta = os.path.join(base_dir, "fotos")

# Crear la carpeta si no existe
os.makedirs(carpeta, exist_ok=True)

# Nombre con fecha y hora
nombre_foto = datetime.now().strftime("%Y-%m-%d_%H-%M-%S") + ".jpg"

# Ruta completa
ruta_foto = os.path.join(carpeta, nombre_foto)

# Cámara
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("No se pudo abrir la cámara")
    exit()

ret, frame = cap.read()

if ret:
    cv2.imwrite(ruta_foto, frame)
    print(f"Foto guardada en: {ruta_foto}")
else:
    print("No se pudo tomar la foto")

cap.release()








