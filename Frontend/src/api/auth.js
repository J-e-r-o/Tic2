// Servicios de autenticación
import client from './client'

export const authAPI = {
  // Login con credenciales
  login: (username, password) =>
    client.post('/api/auth/login', { username, password }),

  // Registrar nuevo usuario (si está disponible)
  register: (username, password, role = 'user') =>
    client.post('/api/auth/register', { username, password, role }),

  // Obtener perfil del usuario actual
  getProfile: () =>
    client.get('/api/auth/me'),

  // Logout
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('rol')
    localStorage.removeItem('username')
    return Promise.resolve()
  },
}
