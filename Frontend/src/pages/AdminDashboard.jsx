import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatsCards from '../components/StatsCards'
import ParkingImage from '../components/ParkingImage'
import OccupancyChart from '../components/OccupancyChart'

const MOCK_DATA = {
  captured_at: '2026-04-23T15:30:00Z',
  total_spots: 8,
  free_spots: 3,
  occupied_spots: 5,
  free_discapacitado: 1,
  occupied_discapacitado: 0,
  image_url: 'https://placehold.co/1200x800?text=Foto+Estacionamiento',
}

const MOCK_HEARTBEAT = {
  online: true,
  ultimo_contacto: '2026-04-23T15:28:00Z',
}

function Heartbeat({ heartbeat }) {
  const minutos = Math.floor(
    (new Date() - new Date(heartbeat.ultimo_contacto)) / 60000
  )
  const online = heartbeat.online && minutos < 10
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
      <span className={`text-xs font-medium ${online ? 'text-green-400' : 'text-red-400'}`}>
        {online ? `Pi online · hace ${minutos} min` : 'Pi sin señal'}
      </span>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [data] = useState(MOCK_DATA)
  const [loadingPhoto, setLoadingPhoto] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const fecha = new Date(data.captured_at).toLocaleString('es-UY', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  async function tomarFotoInstantanea() {
    setLoadingPhoto(true)
    setMensaje('')
    try {
      // TODO: await fetch('http://TU_EC2/api/parking/command/take_photo', { method: 'POST' })
      await new Promise(r => setTimeout(r, 2000))
      setMensaje('Foto solicitada correctamente')
    } catch (e) {
      setMensaje('Error al solicitar la foto')
    } finally {
      setLoadingPhoto(false)
    }
  }

  function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('rol')
  navigate('/login')
}

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white">Dashboard Admin</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/historial')}
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
          >
            Historial
          </button>
          <button
            onClick={tomarFotoInstantanea}
            disabled={loadingPhoto}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
          >
            {loadingPhoto ? 'Solicitando...' : 'Foto instantánea'}
          </button>
          <button
            onClick={logout}
            className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Subheader */}
      <div className="flex items-center gap-4 mb-6">
        <p className="text-gray-400 text-sm">Estacionamiento UM — última captura: {fecha}</p>
        <Heartbeat heartbeat={MOCK_HEARTBEAT} />
      </div>

      {/* Mensaje feedback */}
      {mensaje && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-green-800 text-green-200 text-sm">
          {mensaje}
        </div>
      )}

      {/* Layout: stats izquierda | foto derecha */}
      <div className="flex gap-6 items-start">
        <div className="flex flex-col gap-4 w-64 shrink-0">
          <StatsCards data={data} vertical />
        </div>
        <div className="flex-1 min-w-0">
          <ParkingImage imageUrl={data.image_url} capturedAt={fecha} />
        </div>
      </div>

      {/* Gráfico 24h */}
      <OccupancyChart />

    </div>
  )
}
