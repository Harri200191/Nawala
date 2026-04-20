import { useEffect, useRef, useState, useCallback } from 'react'

const PRICE_COLORS = ['#22c55e', '#84cc16', '#f59e0b', '#ef4444']

function getPriceColor(level) {
  return PRICE_COLORS[Math.min(level, 3)] || '#f59e0b'
}

function StarRating({ rating }) {
  return (
    <span className="text-amber-400 text-xs">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
      <span className="text-gray-400 ml-1">{rating?.toFixed(1)}</span>
    </span>
  )
}

export default function MapView({ places, onPlaceSelect, selectedPlaceId, userLocation, filters }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const infoWindowRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey || window.google?.maps) {
      if (window.google?.maps) setMapLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => setMapLoaded(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return

    const center = userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng }
      : { lat: 24.8607, lng: 67.0011 } // default: Karachi

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      styles: darkMapStyle,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    infoWindowRef.current = new window.google.maps.InfoWindow()
  }, [mapLoaded, userLocation])

  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !userLocation) return
    mapInstanceRef.current.setCenter({ lat: userLocation.lat, lng: userLocation.lng })
  }, [mapLoaded, userLocation])

  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    places.forEach((place) => {
      const loc = place.geometry?.location
      if (!loc) return

      const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat
      const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng

      const isSelected = place.place_id === selectedPlaceId
      const color = getPriceColor(place.price_level || 0)

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        title: place.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 14 : 10,
          fillColor: isSelected ? '#f97316' : color,
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: isSelected ? 3 : 2,
        },
        zIndex: isSelected ? 100 : 1,
      })

      marker.addListener('click', () => {
        onPlaceSelect(place)
        infoWindowRef.current.setContent(
          `<div style="color:#111;font-weight:600;padding:4px 6px;font-size:13px;">${place.name}</div>`
        )
        infoWindowRef.current.open(mapInstanceRef.current, marker)
      })

      markersRef.current.push(marker)
    })
  }, [mapLoaded, places, selectedPlaceId, onPlaceSelect])

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex-1 bg-gray-900 flex flex-col items-center justify-center gap-3 text-center px-6">
        <div className="text-5xl">🗺️</div>
        <h2 className="text-white text-xl font-semibold">Google Maps not configured</h2>
        <p className="text-gray-400 text-sm max-w-xs">
          Add <code className="bg-gray-800 px-1 rounded text-amber-400">VITE_GOOGLE_MAPS_API_KEY</code> to{' '}
          <code className="bg-gray-800 px-1 rounded text-amber-400">client/.env</code> to see the map.
        </p>
        {places.length > 0 && (
          <div className="mt-4 w-full max-w-sm space-y-2">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Nearby places</p>
            {places.slice(0, 6).map((p) => (
              <button
                key={p.place_id}
                onClick={() => onPlaceSelect(p)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  p.place_id === selectedPlaceId
                    ? 'bg-orange-500/20 border-orange-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="text-white font-medium text-sm">{p.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRating rating={p.rating} />
                  <span className="text-gray-500 text-xs">({p.user_ratings_total})</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 relative">
      <div ref={mapRef} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-amber-400 text-sm animate-pulse">Loading map…</div>
        </div>
      )}
    </div>
  )
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2b2b3b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c5c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1e2a1e' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
]
