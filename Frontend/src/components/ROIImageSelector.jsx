import { useState, useRef, useEffect } from 'react'

export default function ROIImageSelector({ coordinates, setCoordinates, imageFile, setImageFile }) {
  const canvasRef = useRef(null)
  const [image, setImage] = useState(null)
  const [clickCount, setClickCount] = useState(0)

  function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        setImage(img)
        setClickCount(0)
        setCoordinates([[0, 0], [0, 0], [0, 0], [0, 0]])
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (image) drawImage()
  }, [clickCount, coordinates, image])

  function drawImage() {
    if (!canvasRef.current || !image) return
    const canvas = canvasRef.current
    
    const maxWidth = 700
    const maxHeight = 500
    let displayWidth = image.width
    let displayHeight = image.height

    if (displayWidth > maxWidth || displayHeight > maxHeight) {
      const ratio = Math.min(maxWidth / displayWidth, maxHeight / displayHeight)
      displayWidth = displayWidth * ratio
      displayHeight = displayHeight * ratio
    }

    canvas.width = image.width
    canvas.height = image.height
    canvas.style.width = displayWidth + 'px'
    canvas.style.height = displayHeight + 'px'

    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)

    // DIBUJAR CUADRILÁTERO (líneas entre puntos)
    if (clickCount >= 2) {
      ctx.strokeStyle = '#00D9FF'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      
      for (let i = 0; i < clickCount; i++) {
        const coord = coordinates[i]
        if (i === 0) ctx.moveTo(coord[0], coord[1])
        else ctx.lineTo(coord[0], coord[1])
      }
      
      // Cerrar el polígono si hay 4 puntos
      if (clickCount === 4) {
        ctx.lineTo(coordinates[0][0], coordinates[0][1])
      }
      ctx.stroke()
    }

    // DIBUJAR LOS PUNTOS
    coordinates.forEach((coord, idx) => {
      if (idx < clickCount) {
        // Círculo de sombra
        ctx.fillStyle = 'rgba(0, 217, 255, 0.2)'
        ctx.beginPath()
        ctx.arc(coord[0], coord[1], 18, 0, Math.PI * 2)
        ctx.fill()

        // Círculo principal (rojo si es el último, cyan si ya está hecho)
        const isLast = idx === clickCount - 1
        ctx.fillStyle = isLast ? '#FF1744' : '#00D9FF'
        ctx.beginPath()
        ctx.arc(coord[0], coord[1], 14, 0, Math.PI * 2)
        ctx.fill()

        // Borde blanco
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(coord[0], coord[1], 14, 0, Math.PI * 2)
        ctx.stroke()

        // Número dentro del círculo
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 20px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(idx + 1, coord[0], coord[1])
      }
    })
  }

  function handleCanvasClick(e) {
    if (!canvasRef.current || !image || clickCount >= 4) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width))
    const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height))

    const newCoordinates = [...coordinates]
    newCoordinates[clickCount] = [x, y]
    setCoordinates(newCoordinates)
    setClickCount(clickCount + 1)
  }

  function resetPoints() {
    setClickCount(0)
    setCoordinates([[0, 0], [0, 0], [0, 0], [0, 0]])
  }

  function removeLastPoint() {
    if (clickCount > 0) {
      const newCoordinates = [...coordinates]
      newCoordinates[clickCount - 1] = [0, 0]
      setCoordinates(newCoordinates)
      setClickCount(clickCount - 1)
    }
  }

  return (
    <div className="mb-6 p-5 bg-gray-800 border-2 border-cyan-600 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">📍</span>
        <h3 className="text-white font-bold text-lg">Marca los 4 Puntos del ROI</h3>
      </div>
      <p className="text-xs text-gray-300 mb-4">
        Haz clic 4 veces en la imagen para marcar las esquinas. Se formará un cuadrilátero automáticamente.
      </p>

      <div className="mb-4">
        <label className="block text-sm text-gray-300 font-semibold mb-2">1️⃣ Selecciona una imagen:</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
        />
      </div>

      {image && (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-300 font-semibold mb-2">2️⃣ Haz clic en los 4 puntos:</p>
            <div className="p-3 bg-black border-4 border-cyan-500 rounded-lg inline-block">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                style={{
                  cursor: clickCount < 4 ? 'crosshair' : 'not-allowed',
                  display: 'block',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>

          <div className="mb-4 p-4 bg-gradient-to-r from-gray-900 to-gray-800 border-2 border-cyan-500 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="text-cyan-300 font-bold text-lg">Progreso: {clickCount} / 4 puntos</p>
                  <p className="text-xs text-gray-400">
                    {clickCount === 0 && "Espera a cargar la imagen..."}
                    {clickCount === 1 && "Haz clic en el segundo punto"}
                    {clickCount === 2 && "Haz clic en el tercer punto"}
                    {clickCount === 3 && "¡Un último clic para completar!"}
                    {clickCount === 4 && "✅ ¡Completo!"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`w-4 h-4 rounded-full transition-all ${i < clickCount ? 'bg-cyan-400 scale-125' : 'bg-gray-600'}`} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {coordinates.map((coord, i) => (
                <div key={i} className={`p-2 rounded text-xs font-mono transition-all ${i < clickCount ? 'bg-cyan-900 text-cyan-200 border border-cyan-500' : 'bg-gray-700 text-gray-500 border border-gray-600'}`}>
                  <span className="font-bold">P{i + 1}:</span> [{coord[0]}, {coord[1]}]
                </div>
              ))}
            </div>

            {clickCount === 4 && (
              <div className="mt-3 p-3 bg-green-900 border-2 border-green-500 rounded text-green-200 text-sm font-bold text-center">
                🎉 ¡Los 4 puntos están marcados! Tu ROI está listo.
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {clickCount > 0 && (
              <>
                <button onClick={removeLastPoint} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition duration-200">
                  ← Deshacer último
                </button>
                <button onClick={resetPoints} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition duration-200">
                  🔄 Empezar de nuevo
                </button>
              </>
            )}

            {clickCount === 4 && (
              <div className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg">
                ✓ Listo para guardar
              </div>
            )}

            {clickCount === 0 && image && (
              <p className="text-sm text-cyan-300 font-semibold">
                👆 Haz clic en la imagen para empezar...
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}