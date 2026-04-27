export default function ParkingImage({ imageUrl, capturedAt }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <p className="text-sm font-semibold text-gray-300">Última foto</p>
        <p className="text-xs text-gray-500">{capturedAt}</p>
      </div>
      <div className="p-4">
        <img
          src={imageUrl}
          alt="Estacionamiento"
          className="w-full rounded-lg object-cover max-h-[600px]"
        />
      </div>
    </div>
  )
}