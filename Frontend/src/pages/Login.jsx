import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../api/auth'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // Si ya hay sesión activa, redirigir directo
  useEffect(() => {
    const rol = localStorage.getItem('rol')
    if (rol === 'admin') navigate('/admin')
    if (rol === 'user')  navigate('/')
  }, [])

  async function handleLogin() {
    setError('')

    if (!username || !password) {
      setError('Completá usuario y contraseña')
      return
    }

    setLoading(true)

    try {
      // Conectar con el backend
      const response = await authAPI.login(username, password)
      const data = response.data

      // Guardar token y rol
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('rol', data.role)
      localStorage.setItem('username', data.username)

      // Redirigir según el rol
      if (data.role === 'admin') navigate('/admin')
      else navigate('/')

    } catch (e) {
      console.error('Error de login:', e)
      if (e.response?.status === 401) {
        setError('Usuario o contraseña incorrectos')
      } else if (e.response?.status === 422) {
        setError('Datos inválidos')
      } else {
        setError('Error al conectar con el servidor')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo / título */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Estacionamiento UM</h1>
          <p className="text-gray-400 text-sm mt-1">Sistema de monitoreo</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Iniciar sesión</h2>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-2 rounded-lg bg-red-900/50 border border-red-800 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Usuario */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ingresá tu usuario"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Contraseña */}
          <div className="mb-6">
            <label className="text-xs text-gray-400 mb-1 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ingresá tu contraseña"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Botón */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition text-sm"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>

        {/* Nota */}
        <p className="text-center text-gray-600 text-xs mt-4">
          Conectando con servidor en: {import.meta.env.VITE_API_URL || 'http://localhost:8000'}
        </p>

        {/* Link a registro */}
        <p className="text-center text-gray-400 text-sm mt-3">
          ¿No tenés cuenta? <button onClick={() => navigate('/signup')} className="text-blue-400 underline">Registrate</button>
        </p>

      </div>
    </div>
  )
}
