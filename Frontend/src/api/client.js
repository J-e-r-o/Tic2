// Cliente HTTP reutilizable con configuración automática de headers
import axios from 'axios'
import API_BASE_URL from './config'

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar token a cada petición
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor para manejar errores globales
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado - limpiar sesión
      localStorage.removeItem('token')
      localStorage.removeItem('rol')
      localStorage.removeItem('username')
      // Redirigir al login (si es posible)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client
