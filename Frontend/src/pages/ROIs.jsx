import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { roisAPI } from '../api/rois'
import { detectAPI } from '../api/detect'

export default function ROIs() {
  const navigate = useNavigate()
  const [rois, setRois] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form para crear ROI
  const [imageFile, setImageFile] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: 'estandar',
    coordinates: [[0, 0], [0, 0], [0, 0], [0, 0]],
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const [editingRoi, setEditingRoi] = useState(null)
  const [editData, setEditData] = useState({
    name: '',
    description: 'estandar',
    coordinates: [[0, 0], [0, 0], [0, 0], [0, 0]],
  })

  function normalizeRoiType(type) {
    if (type === 'normal') return 'estandar'
    if (type === 'discapacitado') return 'accesible'
    return type || 'estandar'
  }
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const [latestImageUrl, setLatestImageUrl] = useState(null)
  const [editorImageSrc, setEditorImageSrc] = useState(null)
  const [editorImageDimensions, setEditorImageDimensions] = useState({ width: 0, height: 0 })
  const editorImageRef = useRef(null)
  const [editorPoints, setEditorPoints] = useState([])
  const [editorError, setEditorError] = useState('')


  useEffect(() => {
    fetchROIs()
    fetchLatestDetectionImage()
  }, [])

  async function fetchLatestDetectionImage() {
    try {
      const detection = await detectAPI.getLatest()
      if (detection?.s3_url) {
        setLatestImageUrl(detection.s3_url)
      }
    } catch (err) {
      console.error('Error fetching latest detection image:', err)
    }
  }

  async function fetchROIs() {
    try {
      const response = await roisAPI.getAll()
      setRois(response.data || [])
    } catch (err) {
      console.error('Error fetching ROIs:', err)
      setError('No se pudo cargar las ROIs')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateROI() {
    setFormError('')
    if (!formData.name.trim()) {
      setFormError('El nombre es requerido')
      return
    }

    setFormLoading(true)
    try {
      await roisAPI.create(formData.name, formData.description, formData.coordinates)
      setFormData({ name: '', description: 'estandar', coordinates: [[0, 0], [0, 0], [0, 0], [0, 0]] })
      setShowForm(false)
      fetchROIs()
    } catch (err) {
      console.error('Error creating ROI:', err)
      setFormError(err.response?.data?.detail || 'Error al crear ROI')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleUpdateROI() {
    setEditError('')
    if (!editData.name.trim()) {
      setEditError('El nombre es requerido')
      return
    }

    setEditLoading(true)
    try {
      await roisAPI.update(editingRoi.id, editData.name, editData.description, editData.coordinates)
      setEditingRoi(null)
      setEditData({ name: '', description: 'estandar', coordinates: [[0, 0], [0, 0], [0, 0], [0, 0]] })
      fetchROIs()
    } catch (err) {
      console.error('Error updating ROI:', err)
      setEditError(err.response?.data?.detail || 'Error al actualizar ROI')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDeleteROI(roiId) {
    const confirmDelete = window.confirm('¿Eliminar esta ROI? Esta acción no se puede deshacer.')
    if (!confirmDelete) return

    try {
      await roisAPI.remove(roiId)
      if (editingRoi?.id === roiId) {
        setEditingRoi(null)
        setEditData({ name: '', description: 'estandar', coordinates: [[0, 0], [0, 0], [0, 0], [0, 0]] })
      }
      fetchROIs()
    } catch (err) {
      console.error('Error deleting ROI:', err)
      setError(err.response?.data?.detail || 'Error al eliminar ROI')
    }
  }

  function startEditROI(roi) {
    const coords = roi.coordinates && roi.coordinates.length === 4
      ? roi.coordinates.map(coord => [coord[0], coord[1]])
      : [[0, 0], [0, 0], [0, 0], [0, 0]]

    setEditingRoi(roi)
    setEditData({
      name: roi.name,
      description: normalizeRoiType(roi.description),
      coordinates: coords,
    })
    // IMPORTANTE: también cargamos los puntos al editor visual para que el click
    // pueda detectar y mover los vértices existentes.
    setEditorPoints(coords)
    // Cargar la última imagen disponible al entrar en modo edición si existe.
    // También reseteamos dimensiones para forzar recálculo onLoad.
    if (latestImageUrl) {
      setEditorImageSrc(latestImageUrl)
      setEditorImageDimensions({ width: 0, height: 0 })
    }

    setShowForm(false)
    setEditError('')
    setEditorError('')
  }


  function cancelEditROI() {
    setEditingRoi(null)
    setEditData({ name: '', description: 'estandar', coordinates: [[0, 0], [0, 0], [0, 0], [0, 0]] })
    setEditError('')
    setEditorImageSrc(null)
    setEditorPoints([])
    setEditorError('')
  }

  function clearEditorPoints() {
    setEditorPoints([])
    setEditorError('')
    if (editingRoi) {
      setEditData({ ...editData, coordinates: [[0, 0], [0, 0], [0, 0], [0, 0]] })
    } else {
      setFormData({ ...formData, coordinates: [[0, 0], [0, 0], [0, 0], [0, 0]] })
    }
  }

  function handleImageFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setEditorImageSrc(url)
    setEditorPoints([])
    setEditorError('')
  }

  function useLatestImage() {
    if (!latestImageUrl) {
      setEditorError('No hay imagen de detección disponible aún.')
      return
    }

    setEditorImageSrc(latestImageUrl)
    setEditorPoints([])
    setEditorError('')
  }

  function handleEditorImageLoad(event) {
    const img = event.currentTarget
    setEditorImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
  }

  function handleImageClick(event) {
    const img = event.currentTarget
    if (!img || !editorImageSrc) return

    const rect = img.getBoundingClientRect()
    const displayedWidth = rect.width
    const displayedHeight = rect.height
    const clickX = Math.min(Math.max(0, event.clientX - rect.left), displayedWidth)
    const clickY = Math.min(Math.max(0, event.clientY - rect.top), displayedHeight)
    const x = Math.round((clickX / displayedWidth) * img.naturalWidth)
    const y = Math.round((clickY / displayedHeight) * img.naturalHeight)

    if (x < 0 || y < 0 || x > img.naturalWidth || y > img.naturalHeight) return

    const MOVE_RADIUS_PX = 18
    const moveRadiusSq = MOVE_RADIUS_PX * MOVE_RADIUS_PX

    const points = editorPoints || []
    const hitIndex = points.findIndex((p) => {
      const dx = p[0] - x
      const dy = p[1] - y
      return (dx * dx + dy * dy) <= moveRadiusSq
    })

    if (hitIndex !== -1) {
      const updated = points.map((p, i) => (i === hitIndex ? [x, y] : p))
      setEditorPoints(updated)
      setEditorError('')
      if (editingRoi) {
        setEditData({ ...editData, coordinates: updated })
      } else {
        setFormData({ ...formData, coordinates: updated })
      }
      return
    }

    if (editorPoints.length >= 4) {
      setEditorError('Ya seleccionaste 4 puntos. Para modificar, tocá cerca de un vértice (punto).')
      return
    }

    const newPoints = [...editorPoints, [x, y]]
    setEditorPoints(newPoints)
    setEditorError('')
    if (editingRoi) {
      setEditData({ ...editData, coordinates: newPoints })
    } else {
      setFormData({ ...formData, coordinates: newPoints })
    }
  }

  function getOverlayPoints() {
    if (!editorImageDimensions.width || !editorImageDimensions.height) return []
    const imgEl = editorImageRef?.current
    const displayedRect = imgEl ? imgEl.getBoundingClientRect() : { width: editorImageDimensions.width, height: editorImageDimensions.height }
    const displayedWidth = displayedRect.width || editorImageDimensions.width
    const displayedHeight = displayedRect.height || editorImageDimensions.height
    const scaleX = displayedWidth / editorImageDimensions.width
    const scaleY = displayedHeight / editorImageDimensions.height

    return editorPoints.map(([x, y]) => {
      const xPx = Math.round(x * scaleX)
      const yPx = Math.round(y * scaleY)
      const xPct = displayedWidth ? Math.max(0, Math.min(100, (xPx / displayedWidth) * 100)) : 0
      const yPct = displayedHeight ? Math.max(0, Math.min(100, (yPx / displayedHeight) * 100)) : 0
      return { x, y, xPx, yPx, xPct, yPct }
    })
  }

  function renderEditorImage() {
    const overlayPoints = getOverlayPoints()
    const svgPoints = overlayPoints.map((p) => `${p.xPct},${p.yPct}`).join(' ')

    const imgEl = editorImageRef?.current
    const displayedRect = imgEl ? imgEl.getBoundingClientRect() : { width: editorImageDimensions.width, height: editorImageDimensions.height }
    const displayedWidth = displayedRect.width || editorImageDimensions.width
    const displayedHeight = displayedRect.height || editorImageDimensions.height

    return (
      <div className="relative inline-block">
        <img
          ref={editorImageRef}
          src={editorImageSrc}
          alt="Editor ROIs"
          className="w-full max-w-[520px] rounded-lg border border-gray-700 cursor-crosshair"
          onClick={handleImageClick}
          onLoad={handleEditorImageLoad}
        />

        {overlayPoints.length > 1 && (
          overlayPoints.length === 4 ? (
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <polygon
                points={svgPoints}
                fill="rgba(0, 217, 255, 0.1)"
                stroke="#00D9FF"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <polyline
                points={svgPoints}
                fill="none"
                stroke="#00D9FF"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
          )
        )}

        {overlayPoints.map((point, idx) => (
          <div
            key={idx}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border bg-cyan-500 text-[10px] font-bold text-white flex items-center justify-center w-5 h-5 pointer-events-none"
            style={{ left: `${point.xPx}px`, top: `${point.yPx}px` }}
          >
            {idx + 1}
          </div>
        ))}
      </div>
    )
  }

  function applyEditorPoints() {
    if (editorPoints.length !== 4) {
      setEditorError('Debes seleccionar exactamente 4 puntos.')
      return
    }

    if (editingRoi) {
      setEditData({ ...editData, coordinates: editorPoints })
    } else {
      setFormData({ ...formData, coordinates: editorPoints })
    }
  }



  function updateCoordinate(index, axis, value) {
    const newCoords = [...formData.coordinates]
    newCoords[index] = [...newCoords[index]]
    newCoords[index][axis] = parseInt(value) || 0
    setFormData({ ...formData, coordinates: newCoords })
  }

  function updateEditCoordinate(index, axis, value) {
    const newCoords = [...editData.coordinates]
    newCoords[index] = [...newCoords[index]]
    newCoords[index][axis] = parseInt(value) || 0
    setEditData({ ...editData, coordinates: newCoords })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white transition text-sm">
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-white">Regiones de Interés (ROIs)</h1>
        </div>
        <div className="flex gap-2">
          {editingRoi ? (
            <button
              onClick={cancelEditROI}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
            >
              Cancelar edición
            </button>
          ) : (
            <button
              onClick={() => {
                setShowForm(!showForm)
                setEditingRoi(null)
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
            >
              {showForm ? 'Cancelar' : 'Crear ROI'}
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-900/50 border border-red-800 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Formulario crear ROI */}
      {showForm && !editingRoi && (
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Nueva ROI</h2>

          {formError && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-900/50 border border-red-800 text-red-300 text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Plaza 1"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
              <select
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="estandar">Estándar</option>
                <option value="accesible">Accesible</option>
              </select>
            </div>
          </div>

          {/* Editor visual (click en imagen) */}
          <div className="mb-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h3 className="text-sm font-semibold">Definir ROI en imagen</h3>
              <div className="flex gap-2">
                <button
                  onClick={useLatestImage}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-2 rounded-lg transition text-xs"
                >
                  Usar última detección
                </button>
                <label className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-3 py-2 rounded-lg transition text-xs cursor-pointer">
                  Elegir archivo
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                </label>
              </div>
            </div>

            {editorError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-900/50 border border-red-800 text-red-300 text-sm">
                {editorError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <div>
                {editorImageSrc ? renderEditorImage() : (
                  <div className="text-gray-400 text-sm">Seleccioná una imagen (o usar la última detección) para marcar 4 puntos haciendo click.</div>
                )}
              </div>

              <div>
                <div className="mb-2 text-xs text-gray-400">Puntos seleccionados (click):</div>
                <div className="mb-3 p-3 bg-gray-900 rounded-lg border border-gray-800 text-xs text-gray-300 font-mono space-y-1">
                  {editorPoints.length > 0 ? (
                    editorPoints.map((p, i) => (
                      <div key={i}>
                        {i + 1}: [{p[0]}, {p[1]}]
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">Aún no seleccionaste puntos.</div>
                  )}
                </div>

                <div className="flex gap-2 mb-2">
                  <button
                    onClick={clearEditorPoints}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold px-3 py-2 rounded-lg transition text-xs"
                  >
                    Limpiar puntos
                  </button>
                  <button
                    onClick={applyEditorPoints}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded-lg transition text-xs"
                  >
                    Aplicar (4 puntos)
                  </button>
                </div>

                <div className="text-xs text-gray-500">
                  Tip: hacé click hasta completar 4 puntos. Se usan las coordenadas de la imagen para guardar la ROI.
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">Coordenadas (4 puntos [x, y])</label>
            <div className="grid grid-cols-4 gap-3">
              {formData.coordinates.map((coord, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="number"
                    value={coord[0]}
                    onChange={(e) => updateCoordinate(i, 0, e.target.value)}
                    placeholder="X"
                    className="w-1/2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                  />
                  <input
                    type="number"
                    value={coord[1]}
                    onChange={(e) => updateCoordinate(i, 1, e.target.value)}
                    placeholder="Y"
                    className="w-1/2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreateROI}
            disabled={formLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white font-semibold py-2 rounded-lg transition text-sm"
          >
            {formLoading ? 'Creando...' : 'Crear ROI'}
          </button>
        </div>
      )}


      {editingRoi && (
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Editar ROI #{editingRoi.id}</h2>

          {editError && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-900/50 border border-red-800 text-red-300 text-sm">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre</label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Ej: Plaza 1"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
              <select
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="estandar">Estándar</option>
                <option value="accesible">Accesible</option>
              </select>
            </div>
          </div>

          {/* Editor visual (click en imagen) */}
          <div className="mb-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h3 className="text-sm font-semibold">Re-definir ROI en imagen</h3>
              <div className="flex gap-2">
                <button
                  onClick={useLatestImage}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-2 rounded-lg transition text-xs"
                >
                  Usar última detección
                </button>
                <label className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-3 py-2 rounded-lg transition text-xs cursor-pointer">
                  Elegir archivo
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                </label>
              </div>
            </div>

            {editorError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-900/50 border border-red-800 text-red-300 text-sm">
                {editorError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <div>
                {editorImageSrc ? renderEditorImage() : (
                  <div className="text-gray-400 text-sm">Seleccioná una imagen (o usar la última detección) para marcar 4 puntos.</div>
                )}
              </div>

              <div>
                <div className="mb-2 text-xs text-gray-400">Puntos seleccionados (click):</div>
                <div className="mb-3 p-3 bg-gray-900 rounded-lg border border-gray-800 text-xs text-gray-300 font-mono space-y-1">
                  {editorPoints.length > 0 ? (
                    editorPoints.map((p, i) => (
                      <div key={i}>
                        {i + 1}: [{p[0]}, {p[1]}]
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">Aún no seleccionaste puntos.</div>
                  )}
                </div>

                <div className="flex gap-2 mb-2">
                  <button
                    onClick={clearEditorPoints}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold px-3 py-2 rounded-lg transition text-xs"
                  >
                    Limpiar puntos
                  </button>
                  <button
                    onClick={applyEditorPoints}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded-lg transition text-xs"
                  >
                    Aplicar (4 puntos)
                  </button>
                </div>

                <div className="text-xs text-gray-500">
                  Al guardar, se usan las coordenadas seleccionadas.
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-2 block">Coordenadas (4 puntos [x, y])</label>
            <div className="grid grid-cols-4 gap-3">
              {editData.coordinates.map((coord, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="number"
                    value={coord[0]}
                    onChange={(e) => updateEditCoordinate(i, 0, e.target.value)}
                    placeholder="X"
                    className="w-1/2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                  />
                  <input
                    type="number"
                    value={coord[1]}
                    onChange={(e) => updateEditCoordinate(i, 1, e.target.value)}
                    placeholder="Y"
                    className="w-1/2 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleUpdateROI}
              disabled={editLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white font-semibold py-2 rounded-lg transition text-sm"
            >
              {editLoading ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              onClick={cancelEditROI}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}


      {/* Lista de ROIs */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Cargando ROIs...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rois.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-400">No hay ROIs creadas. Crea una nueva.</p>
            </div>
          ) : (
            rois.map((roi) => (
              <div key={roi.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-white font-semibold">{roi.name}</h3>
                    <p className="text-xs text-gray-400">
                      {['estandar', 'normal'].includes(roi.description)
                        ? '🅿️ Plaza estándar'
                        : '♿ Plaza accesible'}
                    </p>
                  </div>
                  <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">#{roi.id}</span>
                </div>

                <div className="mb-3 p-3 bg-gray-800 rounded text-xs">
                  <p className="text-gray-300 font-mono">
                    Coordenadas:
                  </p>
                  <div className="mt-1 text-gray-400 font-mono text-xs space-y-1">
                    {roi.coordinates && roi.coordinates.length > 0 ? (
                      roi.coordinates.map((coord, i) => (
                        <div key={i}>Punto {i + 1}: [{coord[0]}, {coord[1]}]</div>
                      ))
                    ) : (
                      <div className="text-gray-500">Sin coordenadas</div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-3">
                  <button
                    onClick={() => startEditROI(roi)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-3 py-2 rounded-lg transition text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteROI(roi.id)}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-2 rounded-lg transition text-sm"
                  >
                    Eliminar
                  </button>
                </div>

                <p className="text-xs text-gray-500">
                  Creada: {new Date(roi.created_at).toLocaleString('es-UY')}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
