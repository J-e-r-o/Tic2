import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const MOCK_HISTORIAL = [
  { id:  1, hora: '2026-04-21T08:00:00Z', libres: 6, ocupados: 2, foto_url: 'https://placehold.co/1200x800?text=21/04+08:00' },
  { id:  2, hora: '2026-04-21T10:00:00Z', libres: 2, ocupados: 6, foto_url: 'https://placehold.co/1200x800?text=21/04+10:00' },
  { id:  3, hora: '2026-04-21T12:00:00Z', libres: 0, ocupados: 8, foto_url: 'https://placehold.co/1200x800?text=21/04+12:00' },
  { id:  4, hora: '2026-04-21T14:00:00Z', libres: 3, ocupados: 5, foto_url: 'https://placehold.co/1200x800?text=21/04+14:00' },
  { id:  5, hora: '2026-04-21T16:00:00Z', libres: 5, ocupados: 3, foto_url: 'https://placehold.co/1200x800?text=21/04+16:00' },
  { id:  6, hora: '2026-04-22T08:00:00Z', libres: 7, ocupados: 1, foto_url: 'https://placehold.co/1200x800?text=22/04+08:00' },
  { id:  7, hora: '2026-04-22T10:00:00Z', libres: 4, ocupados: 4, foto_url: 'https://placehold.co/1200x800?text=22/04+10:00' },
  { id:  8, hora: '2026-04-22T12:00:00Z', libres: 1, ocupados: 7, foto_url: 'https://placehold.co/1200x800?text=22/04+12:00' },
  { id:  9, hora: '2026-04-22T14:00:00Z', libres: 0, ocupados: 8, foto_url: 'https://placehold.co/1200x800?text=22/04+14:00' },
  { id: 10, hora: '2026-04-22T16:00:00Z', libres: 6, ocupados: 2, foto_url: 'https://placehold.co/1200x800?text=22/04+16:00' },
  { id: 11, hora: '2026-04-23T08:00:00Z', libres: 8, ocupados: 0, foto_url: 'https://placehold.co/1200x800?text=23/04+08:00' },
  { id: 12, hora: '2026-04-23T10:00:00Z', libres: 3, ocupados: 5, foto_url: 'https://placehold.co/1200x800?text=23/04+10:00' },
  { id: 13, hora: '2026-04-23T12:00:00Z', libres: 1, ocupados: 7, foto_url: 'https://placehold.co/1200x800?text=23/04+12:00' },
  { id: 14, hora: '2026-04-23T14:00:00Z', libres: 2, ocupados: 6, foto_url: 'https://placehold.co/1200x800?text=23/04+14:00' },
  { id: 15, hora: '2026-04-23T16:00:00Z', libres: 5, ocupados: 3, foto_url: 'https://placehold.co/1200x800?text=23/04+16:00' },
  { id: 16, hora: '2026-03-15T09:00:00Z', libres: 4, ocupados: 4, foto_url: 'https://placehold.co/1200x800?text=15/03+09:00' },
  { id: 17, hora: '2026-03-15T13:00:00Z', libres: 0, ocupados: 8, foto_url: 'https://placehold.co/1200x800?text=15/03+13:00' },
  { id: 18, hora: '2026-03-20T11:00:00Z', libres: 7, ocupados: 1, foto_url: 'https://placehold.co/1200x800?text=20/03+11:00' },
]

function NumberInput({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <input
        type="number"
        min="0"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white w-24 focus:outline-none focus:border-blue-500"
      />
    </div>
  )
}

export default function Historial() {
  const navigate = useNavigate()

  const [minLibres, setMinLibres]     = useState('')
  const [maxLibres, setMaxLibres]     = useState('')
  const [minOcupados, setMinOcupados] = useState('')
  const [maxOcupados, setMaxOcupados] = useState('')
  const [horaDesde, setHoraDesde]     = useState('')
  const [horaHasta, setHoraHasta]     = useState('')
  const [filtroDia, setFiltroDia]     = useState('')
  const [filtroMes, setFiltroMes]     = useState('')
  const [filtroAnio, setFiltroAnio]   = useState('')
  const [fotoModal, setFotoModal]     = useState(null)

  const datos = MOCK_HISTORIAL.filter((row) => {
    const fecha = new Date(row.hora)
    const hora  = fecha.getHours()
    const dia   = fecha.getUTCDate()
    const mes   = fecha.getUTCMonth() + 1
    const anio  = fecha.getUTCFullYear()

    if (minLibres   !== '' && row.libres   < parseInt(minLibres))   return false
    if (maxLibres   !== '' && row.libres   > parseInt(maxLibres))   return false
    if (minOcupados !== '' && row.ocupados < parseInt(minOcupados)) return false
    if (maxOcupados !== '' && row.ocupados > parseInt(maxOcupados)) return false
    if (horaDesde   !== '' && hora         < parseInt(horaDesde))   return false
    if (horaHasta   !== '' && hora         > parseInt(horaHasta))   return false
    if (filtroDia   !== '' && dia         !== parseInt(filtroDia))   return false
    if (filtroMes   !== '' && mes         !== parseInt(filtroMes))   return false
    if (filtroAnio  !== '' && anio        !== parseInt(filtroAnio))  return false
    return true
  })

  function limpiarFiltros() {
    setMinLibres(''); setMaxLibres('')
    setMinOcupados(''); setMaxOcupados('')
    setHoraDesde(''); setHoraHasta('')
    setFiltroDia(''); setFiltroMes(''); setFiltroAnio('')
  }

  function formatHora(isoString) {
    return new Date(isoString).toLocaleString('es-UY', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">

      {/* Modal foto */}
      {fotoModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
          onClick={() => setFotoModal(null)}
        >
          <div
            className="bg-gray-900 rounded-xl overflow-hidden max-w-3xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <p className="text-sm text-gray-300 font-semibold">{fotoModal.hora}</p>
              <button onClick={() => setFotoModal(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <img src={fotoModal.url} alt="Foto estacionamiento" className="w-full object-contain max-h-[70vh]" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white transition text-sm">
          ← Volver al dashboard
        </button>
        <h1 className="text-2xl font-bold text-white">Historial</h1>
      </div>

      {/* Filtros */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <p className="text-xs text-gray-500 uppercase mb-3 font-semibold">Filtros</p>
        <div className="flex flex-wrap gap-6">

          {/* Libres */}
          <div className="flex gap-2 items-end">
            <NumberInput label="Libres mín" value={minLibres} onChange={setMinLibres} placeholder="0" />
            <span className="text-gray-600 pb-2">—</span>
            <NumberInput label="Libres máx" value={maxLibres} onChange={setMaxLibres} placeholder="-" />
          </div>

          {/* Ocupados */}
          <div className="flex gap-2 items-end">
            <NumberInput label="Ocupados mín" value={minOcupados} onChange={setMinOcupados} placeholder="0" />
            <span className="text-gray-600 pb-2">—</span>
            <NumberInput label="Ocupados máx" value={maxOcupados} onChange={setMaxOcupados} placeholder="-" />
          </div>

          {/* Hora */}
          <div className="flex gap-2 items-end">
            <NumberInput label="Hora desde" value={horaDesde} onChange={setHoraDesde} placeholder="0" />
            <span className="text-gray-600 pb-2">—</span>
            <NumberInput label="Hora hasta" value={horaHasta} onChange={setHoraHasta} placeholder="23" />
          </div>

          {/* Fecha */}
          <div className="flex gap-2 items-end">
            <NumberInput label="Día" value={filtroDia} onChange={setFiltroDia} placeholder="1-31" />
            <NumberInput label="Mes" value={filtroMes} onChange={setFiltroMes} placeholder="1-12" />
            <NumberInput label="Año" value={filtroAnio} onChange={setFiltroAnio} placeholder="2026" />
          </div>

          <div className="flex items-end">
            <button
              onClick={limpiarFiltros}
              className="text-sm text-gray-400 hover:text-white transition px-3 py-2 rounded-lg border border-gray-700 hover:border-gray-500"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Hora</th>
              <th className="px-4 py-3 text-center">Libres</th>
              <th className="px-4 py-3 text-center">Ocupados</th>
              <th className="px-4 py-3 text-center">Foto</th>
            </tr>
          </thead>
          <tbody>
            {datos.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No hay registros con esos filtros
                </td>
              </tr>
            ) : (
              datos.map((row, i) => (
                <tr key={row.id} className={i % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900'}>
                  <td className="px-4 py-3 text-gray-300">{formatHora(row.hora)}</td>
                  <td className="px-4 py-3 text-center text-green-400 font-semibold">{row.libres}</td>
                  <td className="px-4 py-3 text-center text-red-400 font-semibold">{row.ocupados}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setFotoModal({ url: row.foto_url, hora: formatHora(row.hora) })}
                      className="text-blue-400 hover:text-blue-300 underline transition"
                    >
                      Ver foto
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-gray-600 text-xs mt-3">{datos.length} registros encontrados</p>
    </div>
  )
}
