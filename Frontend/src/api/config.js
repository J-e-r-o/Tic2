// Configuración base para las peticiones a la API
// Usar variable de entorno si está disponible, sino usar localhost

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default API_BASE_URL
