import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { roisAPI } from '../api/rois'
import { detectAPI } from '../api/detect'

const ROI_COLORS = [
  '#00D9FF', '#FF6B35', '#7FFF00', '#FF1493',
  '#FFD700', '#9B59B6', '#2ECC71', '#E74C3C',
  '#3498DB', '#F39C12', '#1ABC9C', '#E91E63',
]

function polygonCenter(coords) {
  if (!coords?.length) return { x: 0, y: 0 }
  return {
    x: coords.reduce((s, p) => s + p[0], 0) / coords.length,
    y: coords.reduce((s, p) => s + p[1], 0) / coords.length,
  }
}

function normalizeType(t) {
  if (t === 'normal') return 'estandar'
  if (t === 'discapacitado') return 'accesible'
  return t || 'estandar'
}

export default function ROIs() {
  const navigate = useNavigate()
  const svgRef = useRef(null)

  const [rois, setRois] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 'view' | 'edit' | 'create'
  const [mode, setMode] = useState('view')
  const [selectedRoiId, setSelectedRoiId] = useState(null)
  const [selectedVertex, setSelectedVertex] = useState(null) // índice del vértice armado

  const [editData, setEditData] = useState({ name: '', description: 'estandar', coordinates: [] })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const [createData, setCreateData] = useState({ name: '', description: 'estandar' })
  const [createPoints, setCreatePoints] = useState([])
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  const [latestImageUrl, setLatestImageUrl] = useState(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [imageDims, setImageDims] = useState({ w: 0, h: 0 })
  const [canvasMsg, setCanvasMsg] = useState('')

  useEffect(() => {
    fetchROIs()
    fetchLatestImage()
  }, [])

  async function fetchLatestImage() {
    try {
      const det = await detectAPI.getLatest()
      if (det?.s3_url) {
        setLatestImageUrl(det.s3_url)
        setImageSrc(det.s3_url)
      }
    } catch {}
  }

  async function fetchROIs() {
    try {
      const res = await roisAPI.getAll()
      setRois(res.data || [])
    } catch {
      setError('No se pudo cargar las ROIs')
    } finally {
      setLoading(false)
    }
  }

  // ---- Carga de imagen ----
  function loadLatestImage() {
    if (!latestImageUrl) { setCanvasMsg('No hay imagen de detección disponible.'); return }
    setImageSrc(latestImageUrl)
    setImageDims({ w: 0, h: 0 })
    setCanvasMsg('')
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageSrc(URL.createObjectURL(file))
    setImageDims({ w: 0, h: 0 })
    setCanvasMsg('')
    // Resetear el input para poder elegir el mismo archivo de nuevo
    e.target.value = ''
  }

  function onImageLoad(e) {
    const img = e.currentTarget
    setImageDims({ w: img.naturalWidth, h: img.naturalHeight })
  }

  // ---- Coordenadas SVG ----
  function getSvgPoint(e) {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const t = pt.matrixTransform(svg.getScreenCTM().inverse())
    return [Math.round(t.x), Math.round(t.y)]
  }

  // ---- Handlers de clicks en el canvas ----

  // Click en el fondo del SVG (no en polígono ni vértice)
  function handleSvgClick(e) {
    if (!imageDims.w) return

    if (mode === 'create') {
      if (createPoints.length >= 4) return
      const pt = getSvgPoint(e)
      if (pt) setCreatePoints(prev => [...prev, pt])
      return
    }

    // En modo edición sin vértice armado: deseleccionar al clickear el fondo
    if (mode === 'edit' && selectedVertex === null) {
      cancelMode()
    }
  }

  // Click en un polígono existente
  function handlePolygonClick(roi, e) {
    e.stopPropagation()
    if (mode === 'create') return
    selectRoi(roi)
  }

  // Click en un vértice del ROI seleccionado
  function handleVertexClick(idx, e) {
    e.stopPropagation()
    if (mode !== 'edit') return
    // Toggle: click en el mismo vértice lo desarma
    setSelectedVertex(prev => prev === idx ? null : idx)
  }

  // Click en el overlay transparente (cuando hay un vértice armado)
  // El overlay está encima de todo, captura el click antes que los polígonos
  function handleOverlayClick(e) {
    e.stopPropagation()
    if (selectedVertex === null) return
    const pt = getSvgPoint(e)
    if (pt) {
      setEditData(prev => ({
        ...prev,
        coordinates: prev.coordinates.map((p, i) => i === selectedVertex ? pt : p),
      }))
    }
    setSelectedVertex(null)
  }

  // ---- Selección / modos ----
  function selectRoi(roi) {
    if (mode === 'create') return
    setSelectedRoiId(roi.id)
    setEditData({
      name: roi.name,
      description: normalizeType(roi.description),
      coordinates: roi.coordinates.map(c => [c[0], c[1]]),
    })
    setSelectedVertex(null)
    setEditError('')
    setMode('edit')
  }

  function cancelMode() {
    setMode('view')
    setSelectedRoiId(null)
    setSelectedVertex(null)
    setCreatePoints([])
    setCreateError('')
    setEditError('')
  }

  function startCreateMode() {
    setMode('create')
    setCreatePoints([])
    setCreateData({ name: '', description: 'estandar' })
    setCreateError('')
    setSelectedRoiId(null)
    setSelectedVertex(null)
  }

  // ---- CRUD ----
  async function handleCreate() {
    setCreateError('')
    if (!createData.name.trim()) { setCreateError('El nombre es requerido'); return }
    if (createPoints.length !== 4) { setCreateError('Marcá exactamente 4 puntos en la imagen'); return }
    setCreateLoading(true)
    try {
      await roisAPI.create(createData.name, createData.description, createPoints)
      await fetchROIs()
      cancelMode()
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Error al crear ROI')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleUpdate() {
    setEditError('')
    if (!editData.name.trim()) { setEditError('El nombre es requerido'); return }
    setEditLoading(true)
    try {
      await roisAPI.update(selectedRoiId, editData.name, editData.description, editData.coordinates)
      await fetchROIs()
      cancelMode()
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Error al actualizar ROI')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta ROI? Esta acción no se puede deshacer.')) return
    try {
      await roisAPI.remove(id)
      if (selectedRoiId === id) cancelMode()
      await fetchROIs()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al eliminar ROI')
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm(`¿Eliminar los ${rois.length} ROIs? Esta acción no se puede deshacer.`)) return
    try {
      await roisAPI.removeAll()
      cancelMode()
      await fetchROIs()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al eliminar ROIs')
    }
  }

  // ---- Render ----
  const { w: natW, h: natH } = imageDims
  const hasImage = !!imageSrc && natW > 0
  // Radio de vértice escalado a la imagen (aprox 14px a 600px de alto)
  const vertexR = natH ? Math.max(8, Math.round(natH / 55)) : 12

  function renderCanvas() {
    return (
      <div
        className="relative w-full rounded-xl overflow-hidden bg-black"
        style={natW ? { aspectRatio: `${natW}/${natH}` } : { minHeight: '200px' }}
      >
        <img
          src={imageSrc}
          alt="Canvas ROIs"
          className="w-full h-full"
          style={{ objectFit: 'fill' }}
          onLoad={onImageLoad}
        />

        {hasImage && (
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${natW} ${natH}`}
            preserveAspectRatio="none"
            onClick={handleSvgClick}
            style={{ cursor: mode === 'create' && createPoints.length < 4 ? 'crosshair' : 'default' }}
          >
            {/* Todos los ROIs existentes */}
            {rois.map((roi, i) => {
              const color = ROI_COLORS[i % ROI_COLORS.length]
              const isSelected = mode === 'edit' && roi.id === selectedRoiId
              const coords = isSelected ? editData.coordinates : roi.coordinates
              if (!coords?.length) return null
              const pts = coords.map(p => `${p[0]},${p[1]}`).join(' ')
              const center = polygonCenter(coords)

              return (
                <g key={roi.id}>
                  <polygon
                    points={pts}
                    fill={isSelected ? `${color}30` : `${color}15`}
                    stroke={isSelected ? color : `${color}BB`}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeLinejoin="round"
                    onClick={e => handlePolygonClick(roi, e)}
                    style={{ cursor: mode !== 'create' ? 'pointer' : 'default' }}
                  />
                  <text
                    x={center.x}
                    y={center.y}
                    fill={isSelected ? color : `${color}CC`}
                    fontSize={vertexR * 1.5}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {roi.name}
                  </text>

                  {/* Vértices del ROI seleccionado */}
                  {isSelected && coords.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p[0]}
                      cy={p[1]}
                      r={vertexR}
                      fill={selectedVertex === idx ? '#FF1744' : color}
                      stroke="white"
                      strokeWidth={2}
                      onClick={e => handleVertexClick(idx, e)}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </g>
              )
            })}

            {/* Puntos del nuevo ROI en creación */}
            {mode === 'create' && createPoints.length > 0 && (
              <g style={{ pointerEvents: 'none' }}>
                {createPoints.length >= 2 && (
                  createPoints.length === 4 ? (
                    <polygon
                      points={createPoints.map(p => `${p[0]},${p[1]}`).join(' ')}
                      fill="rgba(0,217,255,0.15)"
                      stroke="#00D9FF"
                      strokeWidth={2}
                      strokeLinejoin="round"
                    />
                  ) : (
                    <polyline
                      points={createPoints.map(p => `${p[0]},${p[1]}`).join(' ')}
                      fill="none"
                      stroke="#00D9FF"
                      strokeWidth={2}
                      strokeLinejoin="round"
                    />
                  )
                )}
                {createPoints.map((p, i) => (
                  <circle key={i} cx={p[0]} cy={p[1]} r={vertexR} fill="#00D9FF" stroke="white" strokeWidth={2} />
                ))}
              </g>
            )}

            {/* Overlay transparente cuando hay un vértice armado.
                Se renderiza al final para quedar encima y capturar todos los clicks. */}
            {mode === 'edit' && selectedVertex !== null && (
              <rect
                x={0} y={0} width={natW} height={natH}
                fill="transparent"
                onClick={handleOverlayClick}
                style={{ cursor: 'crosshair' }}
              />
            )}
          </svg>
        )}
      </div>
    )
  }

  function renderPanel() {
    if (mode === 'create') {
      return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Nuevo ROI</h2>

          {createError && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-900/50 border border-red-800 text-red-300 text-xs">
              {createError}
            </div>
          )}

          <div className="mb-3 p-3 bg-gray-800 rounded-lg">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-400">Puntos marcados</span>
              <span className={createPoints.length === 4 ? 'text-green-400' : 'text-cyan-400'}>
                {createPoints.length} / 4
              </span>
            </div>
            <div className="flex gap-1 mb-1.5">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-all ${i < createPoints.length ? 'bg-cyan-400' : 'bg-gray-700'}`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-600">
              {createPoints.length < 4
                ? 'Hacé click en la imagen para marcar los vértices'
                : 'Completá el formulario y guardá'}
            </p>
          </div>

          {createPoints.length > 0 && (
            <button
              onClick={() => setCreatePoints([])}
              className="w-full mb-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs py-1.5 rounded-lg transition"
            >
              Limpiar puntos
            </button>
          )}

          <div className="mb-3">
            <label className="text-xs text-gray-400 mb-1 block">Nombre</label>
            <input
              type="text"
              value={createData.name}
              onChange={e => setCreateData(d => ({ ...d, name: e.target.value }))}
              placeholder="Ej: Plaza 1"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
            />
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
            <select
              value={createData.description}
              onChange={e => setCreateData(d => ({ ...d, description: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="estandar">Estándar</option>
              <option value="accesible">Accesible</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createLoading || createPoints.length !== 4 || !createData.name.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-2 rounded-lg text-sm transition"
            >
              {createLoading ? 'Creando...' : 'Crear ROI'}
            </button>
            <button
              onClick={cancelMode}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg text-sm transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )
    }

    if (mode === 'edit' && selectedRoiId) {
      const roiIdx = rois.findIndex(r => r.id === selectedRoiId)
      const color = ROI_COLORS[roiIdx >= 0 ? roiIdx % ROI_COLORS.length : 0]

      return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <h2 className="text-sm font-semibold text-white">Editando ROI</h2>
          </div>

          {editError && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-900/50 border border-red-800 text-red-300 text-xs">
              {editError}
            </div>
          )}

          <div className="mb-3 p-2.5 bg-gray-800 rounded-lg text-xs">
            {selectedVertex !== null ? (
              <span className="text-yellow-400">
                Vértice {selectedVertex + 1} activo — hacé click en la imagen para moverlo
              </span>
            ) : (
              <span className="text-gray-400">
                Hacé click en un vértice (círculo de color) para seleccionarlo y moverlo
              </span>
            )}
          </div>

          <div className="mb-3">
            <label className="text-xs text-gray-400 mb-1 block">Nombre</label>
            <input
              type="text"
              value={editData.name}
              onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
            />
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
            <select
              value={editData.description}
              onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="estandar">Estándar</option>
              <option value="accesible">Accesible</option>
            </select>
          </div>

          <div className="flex gap-2 mb-2">
            <button
              onClick={handleUpdate}
              disabled={editLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white font-semibold py-2 rounded-lg text-sm transition"
            >
              {editLoading ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={cancelMode}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg text-sm transition"
            >
              Cancelar
            </button>
          </div>

          <button
            onClick={() => handleDelete(selectedRoiId)}
            className="w-full bg-transparent hover:bg-red-950 border border-red-900 text-red-400 hover:text-red-300 font-semibold py-1.5 rounded-lg text-sm transition"
          >
            Eliminar ROI
          </button>
        </div>
      )
    }

    // Modo view
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <button
          onClick={startCreateMode}
          disabled={!imageSrc}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-2 rounded-lg text-sm transition"
          title={!imageSrc ? 'Cargá una imagen primero' : ''}
        >
          + Crear nuevo ROI
        </button>
        {!imageSrc && (
          <p className="text-xs text-gray-600 text-center mt-2">Cargá una imagen para empezar</p>
        )}
        {imageSrc && rois.length > 0 && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Hacé click en un ROI de la imagen o en la lista para editarlo
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white transition text-sm">
            ← Volver
          </button>
          <h1 className="text-2xl font-bold">Regiones de Interés (ROIs)</h1>
        </div>
        <div className="flex gap-2">
          {rois.length > 0 && mode === 'view' && (
            <button
              onClick={handleDeleteAll}
              className="bg-red-900/60 hover:bg-red-800 border border-red-800 text-red-300 hover:text-red-200 font-semibold px-3 py-2 rounded-lg transition text-xs"
            >
              Eliminar todos los ROIs
            </button>
          )}
          <button
            onClick={loadLatestImage}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-2 rounded-lg transition text-xs"
          >
            Usar última detección
          </button>
          <label className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-3 py-2 rounded-lg transition text-xs cursor-pointer">
            Elegir archivo
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/50 border border-red-800 text-red-200 text-sm">
          {error}
        </div>
      )}
      {canvasMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-yellow-900/50 border border-yellow-800 text-yellow-200 text-sm">
          {canvasMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-2">
          {imageSrc ? (
            renderCanvas()
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-900 border border-gray-800 rounded-xl">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-1">Sin imagen cargada</p>
                <p className="text-gray-600 text-xs">Usá los botones de arriba para cargar una imagen</p>
              </div>
            </div>
          )}
        </div>

        {/* Panel + lista */}
        <div className="lg:col-span-1 space-y-4">
          {renderPanel()}

          {/* Lista de ROIs */}
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : rois.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-4">No hay ROIs creadas.</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-600 px-1">
                {rois.length} ROI{rois.length !== 1 ? 's' : ''}
              </p>
              {rois.map((roi, i) => {
                const color = ROI_COLORS[i % ROI_COLORS.length]
                const isSelected = mode === 'edit' && selectedRoiId === roi.id
                return (
                  <div
                    key={roi.id}
                    onClick={() => mode !== 'create' && selectRoi(roi)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'border-gray-600 bg-gray-800'
                        : 'border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{roi.name}</p>
                        <p className="text-xs text-gray-500">
                          {normalizeType(roi.description) === 'accesible' ? '♿ Accesible' : '🅿️ Estándar'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(roi.id) }}
                      className="text-gray-700 hover:text-red-400 transition ml-2 flex-shrink-0 text-lg leading-none pb-0.5"
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
