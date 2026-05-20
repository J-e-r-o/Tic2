import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StatsCards from '../components/StatsCards'
import ParkingImage from '../components/ParkingImage'
import { detectAPI } from '../api/detect'

export default function UserDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLatestDetection()
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchLatestDetection, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchLatestDetection() {
    try {
      const response = await detectAPI.getDetectionHistory(1)
      const detections = response.data?.detections || []
      
      if (detections.length > 0) {
        const detection = detections[0]
        const summary = detection.summary || {}
        
        setData({
          captured_at: detection.timestamp,
          total_spots: summary.total_spots || 0,
          free_spots: summary.free || 0,
          occupied_spots: summary.occupied || 0,
          free_discapacitado: 0,
          occupied_discapacitado: 0,
          image_url: detection.s3_url || 'https://placehold.co/1200x800?text=Sin+imagen',
        })
      } else {
        setData(null)
      }
    } catch (err) {
      console.error('Error fetching detection:', err)
      setError('No se pudo cargar la información del estacionamiento')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('rol')
    localStorage.removeItem('username')
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p>Cargando información del estacionamiento...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Estacionamiento UM</h1>
          <button
            onClick={logout}
            className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
          >
            Cerrar sesión
          </button>
        </div>
        <div className="bg-red-900/50 border border-red-800 rounded-lg p-4 text-red-200">
          {error}
        </div>
      </div>
    )
  }

  const fecha = data?.captured_at 
    ? new Date(data.captured_at).toLocaleString('es-UY', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'Sin datos'

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-white">Estacionamiento UM</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchLatestDetection}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
          >
            Recargar datos
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
        <p className="text-gray-400 text-sm">Última captura: {fecha}</p>
      </div>

      {!data ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-300 mb-2 font-semibold">No hay datos de detección disponibles.</p>
          <p className="text-sm text-gray-500">Sube una foto desde el panel de administrador para que se registre la primera detección.</p>
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          <div className="flex flex-col gap-4 w-64 shrink-0">
            <StatsCards data={data} vertical />
          </div>
          <div className="flex-1 min-w-0">
            <ParkingImage imageUrl={data.image_url} capturedAt={fecha} />
          </div>
        </div>
      )}

    </div>
  )
}
