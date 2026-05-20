import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StatsCards from '../components/StatsCards'
import ParkingImage from '../components/ParkingImage'
import OccupancyChart from '../components/OccupancyChart'
import { detectAPI } from '../api/detect'

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
  const [data, setData] = useState(null)
  const [loadingPhoto, setLoadingPhoto] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [fileInput, setFileInput] = useState(null)

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
          free_discapacitado: summary.free_discapacitado || 0,
          occupied_discapacitado: summary.occupied_discapacitado || 0,
          image_url: detection.s3_url || 'https://placehold.co/1200x800?text=Sin+imagen',
        })
      }
    } catch (err) {
      console.error('Error fetching detection:', err)
    } finally {
      setLoadingData(false)
    }
  }

  async function tomarFotoInstantanea() {
    setLoadingPhoto(true)
    setMensaje('')
    
    // Abrir input de archivo
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) {
        setLoadingPhoto(false)
        return
      }

      try {
        const response = await detectAPI.uploadAndDetect(file)
        
        if (response.data.status === 'success') {
          setMensaje('Foto procesada correctamente - Plazas: ' + 
            response.data.free_spots + ' libres de ' + response.data.total_spots)
          // Actualizar datos
          await fetchLatestDetection()
        } else {
          setMensaje('Error: ' + (response.data.message || 'Error al procesar la foto'))
        }
      } catch (err) {
        console.error('Error:', err)
        setMensaje('Error al conectar con el servidor')
      } finally {
        setLoadingPhoto(false)
      }
    }
    
    input.click()
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('rol')
    localStorage.removeItem('username')
    navigate('/login')
  }

  const fecha = data?.captured_at 
    ? new Date(data.captured_at).toLocaleString('es-UY', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'Sin datos'

  const heartbeat = {
    online: true,
    ultimo_contacto: data?.captured_at || new Date().toISOString(),
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
            onClick={() => navigate('/rois')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
          >
            ROIs
          </button>
          <button
            onClick={tomarFotoInstantanea}
            disabled={loadingPhoto}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
          >
            {loadingPhoto ? 'Cargando...' : 'Subir foto'}
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
        <Heartbeat heartbeat={heartbeat} />
      </div>

      {/* Mensaje feedback */}
      {mensaje && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-blue-900/50 border border-blue-700 text-blue-200 text-sm">
          {mensaje}
        </div>
      )}

      {/* Loading state */}
      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Cargando datos...</p>
          </div>
        </div>
      ) : data ? (
        <>
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
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400">No hay datos disponibles</p>
        </div>
      )}

    </div>
  )
}
