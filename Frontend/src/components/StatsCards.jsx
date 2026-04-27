export default function StatsCards({ data, vertical = false }) {
  const porcentaje = Math.round((data.occupied_spots / data.total_spots) * 100)

  const cards = [
    {
      label: 'Lugares libres',
      value: data.free_spots,
      color: 'text-green-400',
      bg: 'bg-green-900/30 border-green-800',
    },
    {
      label: 'Lugares ocupados',
      value: data.occupied_spots,
      color: 'text-red-400',
      bg: 'bg-red-900/30 border-red-800',
    },
    {
      label: 'Discapacitado libre',
      value: data.free_discapacitado,
      color: 'text-blue-400',
      bg: 'bg-blue-900/30 border-blue-800',
    },
    {
      label: 'Discapacitado ocupado',
      value: data.occupied_discapacitado,
      color: 'text-yellow-400',
      bg: 'bg-yellow-900/30 border-yellow-800',
    },
  ]

  if (vertical) {
    return (
      <div className="flex flex-col gap-3">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.bg}`}>
            <p className="text-gray-400 text-xs mb-1">{card.label}</p>
            <p className={`text-4xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-gray-500 text-xs mt-1">de {data.total_spots} totales</p>
          </div>
        ))}

        {/* Porcentaje total ocupado */}
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
          <p className="text-gray-400 text-xs mb-2">Ocupación total</p>
          <p className="text-3xl font-bold text-white mb-2">{porcentaje}%</p>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${porcentaje}%`,
                backgroundColor: porcentaje > 80 ? '#ef4444' : porcentaje > 50 ? '#f59e0b' : '#22c55e',
              }}
            />
          </div>
          <p className="text-gray-500 text-xs mt-1">{data.occupied_spots} de {data.total_spots} plazas</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-xl border p-4 ${card.bg}`}>
          <p className="text-gray-400 text-xs mb-1">{card.label}</p>
          <p className={`text-4xl font-bold ${card.color}`}>{card.value}</p>
          <p className="text-gray-500 text-xs mt-1">de {data.total_spots} totales</p>
        </div>
      ))}
    </div>
  )
}
