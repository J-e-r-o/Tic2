import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Mock datos últimas 24h — reemplazar con fetch al backend
const MOCK_24H = [
  { hora: '00:00', libres: 8, ocupados: 0 },
  { hora: '02:00', libres: 8, ocupados: 0 },
  { hora: '04:00', libres: 8, ocupados: 0 },
  { hora: '06:00', libres: 7, ocupados: 1 },
  { hora: '08:00', libres: 4, ocupados: 4 },
  { hora: '09:00', libres: 1, ocupados: 7 },
  { hora: '10:00', libres: 0, ocupados: 8 },
  { hora: '11:00', libres: 0, ocupados: 8 },
  { hora: '12:00', libres: 2, ocupados: 6 },
  { hora: '13:00', libres: 1, ocupados: 7 },
  { hora: '14:00', libres: 0, ocupados: 8 },
  { hora: '15:00', libres: 3, ocupados: 5 },
  { hora: '16:00', libres: 5, ocupados: 3 },
  { hora: '17:00', libres: 6, ocupados: 2 },
  { hora: '18:00', libres: 7, ocupados: 1 },
  { hora: '20:00', libres: 8, ocupados: 0 },
  { hora: '22:00', libres: 8, ocupados: 0 },
]

export default function OccupancyChart() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 mt-6">
      <p className="text-sm font-semibold text-gray-300 mb-4">Ocupación — últimas 24 horas</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={MOCK_24H} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="hora" tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} domain={[0, 8]} />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#f3f4f6' }}
          />
          <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
          <Line type="monotone" dataKey="libres" stroke="#22c55e" strokeWidth={2} dot={false} name="Libres" />
          <Line type="monotone" dataKey="ocupados" stroke="#ef4444" strokeWidth={2} dot={false} name="Ocupados" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
