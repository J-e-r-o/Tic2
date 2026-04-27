import cv2
import numpy as np
from typing import List, Tuple

def procesar_imagen_opencv(image_bytes: bytes) -> np.ndarray:
    """
    Convierte bytes de imagen a numpy array (formato OpenCV BGR)
    
    Args:
        image_bytes: Contenido binario de la imagen
    
    Returns:
        Imagen en formato BGR de OpenCV
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def ajustar_tamaño_imagen(img: np.ndarray, max_width: int = 1920, max_height: int = 1080) -> np.ndarray:
    """
    Ajusta el tamaño de la imagen si excede el máximo
    
    Args:
        img: Imagen OpenCV
        max_width: Ancho máximo
        max_height: Alto máximo
    
    Returns:
        Imagen redimensionada (si fue necesario)
    """
    height, width = img.shape[:2]
    
    if width > max_width or height > max_height:
        ratio = min(max_width / width, max_height / height)
        new_width = int(width * ratio)
        new_height = int(height * ratio)
        img = cv2.resize(img, (new_width, new_height))
    
    return img

def guardar_imagen_temporal(img: np.ndarray, ruta: str) -> bool:
    """
    Guarda una imagen OpenCV en disco (para testing/debugging)
    
    Args:
        img: Imagen OpenCV
        ruta: Ruta donde guardar
    
    Returns:
        True si fue exitoso
    """
    try:
        cv2.imwrite(ruta, img)
        return True
    except Exception as e:
        print(f"Error guardando imagen: {e}")
        return False

def obtener_estadisticas_imagen(img: np.ndarray) -> dict:
    """
    Extrae estadísticas básicas de la imagen
    
    Returns:
        Dict con ancho, alto, canales, etc.
    """
    height, width = img.shape[:2]
    channels = img.shape[2] if len(img.shape) == 3 else 1
    
    return {
        "width": width,
        "height": height,
        "channels": channels,
        "tamaño_pixeles": width * height,
        "tamaño_kb": width * height * channels / 1024,
    }
