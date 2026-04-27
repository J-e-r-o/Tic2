import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatsCards from '../components/StatsCards'
import ParkingImage from '../components/ParkingImage'

const MOCK_DATA = {
  captured_at: '2026-04-23T15:30:00Z',
  total_spots: 8,
  free_spots: 3,
  occupied_spots: 5,
  free_discapacitado: 1,
  occupied_discapacitado: 0,
  image_url: 'https://placehold.co/1200x800?text=Foto+Estacionamiento',
}

export default function UserDashboard() {
  const navigate = useNavigate()
  const [data] = useState(MOCK_DATA)

  const fecha = new Date(data.captured_at).toLocaleString('es-UY', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('rol')
  navigate('/login')
}

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white">Estacionamiento UM</h1>
        <button
          onClick={logout}
          className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Subheader */}
      <div className="flex items-center gap-4 mb-6">
        <p className="text-gray-400 text-sm">Última captura: {fecha}</p>
      </div>

      {/* Layout: stats izquierda | foto derecha */}
      <div className="flex gap-6 items-start">
        <div className="flex flex-col gap-4 w-64 shrink-0">
          <StatsCards data={data} vertical />
        </div>
        <div className="flex-1 min-w-0">
          <ParkingImage imageUrl={data.image_url} capturedAt={fecha} />
        </div>
      </div>

    </div>
  )
}
