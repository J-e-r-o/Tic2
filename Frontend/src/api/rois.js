// Servicios de ROIs (Regions of Interest)
import client from './client'

export const roisAPI = {
  // Obtener todos los ROIs
  getAll: () =>
    client.get('/api/rois/list'),

  // Obtener un ROI específico
  getById: (roiId) =>
    client.get(`/api/rois/${roiId}`),

  // Crear nuevo ROI
  create: (name, description, coordinates) =>
    client.post('/api/rois/create', {
      name,
      description,
      coordinates,
    }),

  // Actualizar ROI existente
  update: (roiId, name, description, coordinates) =>
    client.put(`/api/rois/${roiId}`, {
      name,
      description,
      coordinates,
    }),

  // Eliminar ROI existente
  remove: (roiId) =>
    client.delete(`/api/rois/${roiId}`),

  // Eliminar todos los ROIs
  removeAll: () =>
    client.delete('/api/rois/'),

  // Obtener o crear si no existen (helper)
  listOrEmpty: async () => {
    try {
      const res = await client.get('/api/rois/list')
      return res.data || []
    } catch (err) {
      console.error('Error fetching ROIs:', err)
      return []
    }
  },
}
