import cv2

# Abrir la cámara (0 = cámara por defecto)
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("No se pudo abrir la cámara")
    exit()

# Capturar un frame
ret, frame = cap.read()

if ret:
    # Guardar la imagen
    cv2.imwrite("foto.png", frame)
    print("Foto guardada como foto.png")
else:
    print("No se pudo tomar la foto")

# Liberar la cámara
cap.release()









