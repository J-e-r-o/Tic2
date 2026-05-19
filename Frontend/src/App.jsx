import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminDashboard from './pages/AdminDashboard'
import UserDashboard from './pages/UserDashboard'
import Historial from './pages/Historial'
import ROIs from './pages/ROIs'
import Login from './pages/Login'
import Signup from './pages/Signup'

// ── Rutas protegidas ──────────────────────────────────────────────────────────
// Verifica que haya sesión activa y que el rol sea el correcto.
// Si no, redirige al login.

function RutaAdmin({ children }) {
  const rol = localStorage.getItem('rol')
  if (!rol) return <Navigate to="/login" replace />
  if (rol !== 'admin') return <Navigate to="/" replace />
  return children
}

function RutaUser({ children }) {
  const rol = localStorage.getItem('rol')
  if (!rol) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/" element={
          <RutaUser><UserDashboard /></RutaUser>
        } />

        <Route path="/admin" element={
          <RutaAdmin><AdminDashboard /></RutaAdmin>
        } />

        <Route path="/historial" element={
          <RutaAdmin><Historial /></RutaAdmin>
        } />

        <Route path="/rois" element={
          <RutaAdmin><ROIs /></RutaAdmin>
        } />

        {/* Cualquier ruta desconocida → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
