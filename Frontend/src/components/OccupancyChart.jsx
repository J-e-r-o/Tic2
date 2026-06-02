import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { detectAPI } from '../api/detect'

export default function OccupancyChart() {
  const [data, setData] = useState([])
  const [maxSpots, setMaxSpots] = useState(10)
  const [loading, setLoading] = useState(true)
  const [tieneDatosHoy, setTieneDatosHoy] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await detectAPI.getDetectionHistory(200)
      const detections = res.data?.detections || []

      if (detections.length === 0) {
        setData([])
        return
      }

      // Máximo de spots entre todas las detecciones
      const max = Math.max(...detections.map(d => d.summary?.total_spots || 0))
      setMaxSpots(max || 10)

      // Filtrar detecciones de hoy
      const hoy = new Date().toDateString()
      const deHoy = detections.filter(d => new Date(d.timestamp).toDateString() === hoy)

      setTieneDatosHoy(deHoy.length > 0)

      // Si no hay datos de hoy, usar las últimas 20 detecciones
      const fuente = deHoy.length > 0 ? deHoy : detections.slice(0, 20).reverse()

      const puntos = fuente.map(d => {
        const fecha = new Date(d.timestamp)
        const hhmm = fecha.getHours().toString().padStart(2, '0') + ':' + fecha.getMinutes().toString().padStart(2, '0')
        const hora = deHoy.length > 0
          ? hhmm
          : `${fecha.getDate()}/${fecha.getMonth() + 1} ${hhmm}`
        return {
          hora,
          libres: d.summary?.free || 0,
          ocupados: d.summary?.occupied || 0,
        }
      })

      setData(puntos)
    } catch (err) {
      console.error('Error cargando gráfica:', err)
    } finally {
      setLoading(false)
    }
  }

  const titulo = tieneDatosHoy
    ? `Ocupación — ${new Date().toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' })}`
    : data.length > 0
      ? 'Ocupación — sin datos de hoy, mostrando últimas detecciones'
      : 'Ocupación — sin detecciones registradas'

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 mt-6">
      <p className="text-sm font-semibold text-gray-300 mb-4">{titulo}</p>

      {loading ? (
        <div className="flex justify-center items-center h-[220px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex justify-center items-center h-[220px]">
          <p className="text-gray-500 text-sm">No hay detecciones registradas</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="hora" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} domain={[0, maxSpots]} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#f3f4f6' }}
            />
            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
            <Line type="monotone" dataKey="libres" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Libres" />
            <Line type="monotone" dataKey="ocupados" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Ocupados" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
