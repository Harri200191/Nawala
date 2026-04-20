import { useState, useEffect } from 'react'

const PRICE_LABEL = ['', '$', '$$', '$$$', '$$$$']

function PlaceCard({ place, onClick, isSelected }) {
  return (
    <button
      onClick={() => onClick(place)}
      className={`shrink-0 w-44 bg-gray-800/70 rounded-2xl overflow-hidden border transition-all text-left hover:scale-[1.02] ${
        isSelected ? 'border-amber-500' : 'border-gray-700/50 hover:border-gray-600'
      }`}
    >
      {place.photos?.[0] && import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
        <img
          src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photo_reference=${place.photos[0].photo_reference}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`}
          alt={place.name}
          className="w-full h-24 object-cover"
          onError={(e) => { e.target.closest('.overflow-hidden').style.paddingTop = '0'; e.target.remove() }}
        />
      ) : (
        <div className="w-full h-24 bg-gray-700 flex items-center justify-center text-3xl">🍴</div>
      )}
      <div className="p-2.5 space-y-1">
        <p className="text-white text-xs font-semibold line-clamp-1">{place.name}</p>
        <div className="flex items-center gap-1">
          <span className="text-amber-400 text-xs">★</span>
          <span className="text-gray-300 text-xs">{place.rating?.toFixed(1)}</span>
          {place.price_level && (
            <span className="text-emerald-400 text-xs ml-auto">{PRICE_LABEL[place.price_level]}</span>
          )}
        </div>
        <p className="text-gray-500 text-xs line-clamp-1">{place.vicinity}</p>
      </div>
    </button>
  )
}

export default function ForYouSection({ userLocation, userProfile, onPlaceSelect, selectedPlaceId }) {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [label, setLabel] = useState('For You')

  useEffect(() => {
    if (!userLocation) return

    const topCuisines = userProfile?.cuisines?.slice(0, 2) || []
    const keyword = topCuisines.length > 0 ? topCuisines[0] : ''
    const radius = userProfile?.filters?.radius || 3000
    const minRating = 3.5

    setLabel(keyword ? `For You — ${keyword}` : 'For You')
    setLoading(true)

    const params = new URLSearchParams({
      lat: userLocation.lat,
      lng: userLocation.lng,
      radius,
      keyword,
      min_rating: minRating,
    })

    fetch(`/api/places/nearby?${params}`)
      .then((r) => r.json())
      .then((data) => setPlaces((data.results || []).slice(0, 10)))
      .catch(() => setPlaces([]))
      .finally(() => setLoading(false))
  }, [userLocation, userProfile?.cuisines])

  if (!userLocation) return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl px-4 pointer-events-none">
      <div className="bg-gray-950/90 backdrop-blur-sm rounded-2xl border border-gray-800 p-3 pointer-events-auto">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-amber-400 text-xs">✦</span>
          <span className="text-white text-xs font-semibold">{label}</span>
          {loading && <div className="w-3 h-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin ml-auto" />}
        </div>

        {places.length > 0 ? (
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            {places.map((place) => (
              <PlaceCard
                key={place.place_id}
                place={place}
                onClick={onPlaceSelect}
                isSelected={place.place_id === selectedPlaceId}
              />
            ))}
          </div>
        ) : !loading ? (
          <p className="text-gray-500 text-xs">
            Add cuisine preferences in Filters to see personalised picks.
          </p>
        ) : null}
      </div>
    </div>
  )
}
