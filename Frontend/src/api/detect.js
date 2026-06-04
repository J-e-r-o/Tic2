// Servicios de detección de plazas
import client from './client'

export const detectAPI = {
  // Subir imagen y detectar plazas
  uploadAndDetect: (imageFile) => {
    const formData = new FormData()
    formData.append('file', imageFile)
    
    return client.post('/api/detect/upload-and-detect', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Obtener historial de detecciones
  getDetectionHistory: (limit = 50) =>
    client.get('/api/detect/history', { params: { limit } }),

  // Obtener detalles de una detección
  getDetectionById: (detectionId) =>
    client.get(`/api/detect/${detectionId}`),

  // Obtener la última detección
  getLatest: () =>
    client.get('/api/detect/history', { params: { limit: 1 } })
      .then(res => res.data?.detections?.[0] || null)
      .catch(() => null),

  // Enviar comando a la Pi para que saque una foto
  requestPiCapture: () =>
    client.post('/api/pi/command'),
}
