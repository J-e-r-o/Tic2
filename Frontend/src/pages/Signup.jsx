import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../api/auth'

export default function Signup() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup() {
    setError('')
    if (!username || !password) {
      setError('Completá usuario y contraseña')
      return
    }

    setLoading(true)
    try {
      // Registrar
      await authAPI.register(username, password, role)
      // Luego loguear automáticamente
      const res = await authAPI.login(username, password)
      const data = res.data
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('rol', data.role)
      localStorage.setItem('username', data.username)

      if (data.role === 'admin') navigate('/admin')
      else navigate('/')
    } catch (e) {
      console.error('Signup error:', e)
      if (e.response?.data?.detail) setError(String(e.response.data.detail))
      else setError('Error al registrar usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Registro</h1>
          <p className="text-gray-400 text-sm mt-1">Crea tu cuenta</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          {error && <div className="mb-4 px-4 py-2 rounded-lg bg-red-900/50 border border-red-800 text-red-300 text-sm">{error}</div>}

          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">Usuario</label>
            <input value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">Contraseña</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>

          <div className="mb-6">
            <label className="text-xs text-gray-400 mb-1 block">Rol</label>
            <select value={role} onChange={(e)=>setRole(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <button onClick={handleSignup} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-900 text-white font-semibold py-2 rounded-lg">{loading ? 'Registrando...' : 'Registrarme'}</button>

          <p className="text-xs text-gray-500 text-center mt-3">¿Ya tenés cuenta? <button onClick={()=>navigate('/login')} className="text-blue-400 underline">Ingresar</button></p>
        </div>
      </div>
    </div>
  )
}
