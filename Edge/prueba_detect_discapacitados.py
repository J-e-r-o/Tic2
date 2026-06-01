import cv2
import numpy as np

img = cv2.imread("../../fotos/foto1.jpeg")
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

# Centro aproximado de la plaza AZUL (discapacitado)
print("Azul:", hsv[1343, 177])   # usá coordenadas del centro de esa plaza

# Centro aproximado de una plaza NORMAL (asfalto)
print("Normal:", hsv[1163, 519])  # centro de plaza 2