import { useState, useEffect, useCallback, useRef } from 'react'
import MapView from './components/MapView'
import FilterSidebar from './components/FilterSidebar'
import DetailDrawer from './components/DetailDrawer'
import Chatbot from './components/Chatbot'
import ForYouSection from './components/ForYouSection'
import { usePlaces } from './hooks/usePlaces'
import { useUserProfile } from './hooks/useUserProfile'

const DEFAULT_FILTERS = {
  radius: 2000,
  minRating: 0,
  dietary: 'both',
  cuisines: [],
  budget: [0, 100],
  priceLevels: [],
  caloriesEnabled: false,
  calories: [0, 2000],
}

export default function App() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const searchDebounceRef = useRef(null)

  const { places, loading: placesLoading, error: placesError, fetchNearby } = usePlaces()
  const { profile, updateProfile, addVisited } = useUserProfile()

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported')
      setUserLocation({ lat: 24.8607, lng: 67.0011 })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setLocationError('Location access denied — showing default area')
        setUserLocation({ lat: 24.8607, lng: 67.0011 })
      },
      { timeout: 8000 }
    )
  }, [])

  useEffect(() => {
    if (!userLocation) return
    const keyword = [searchQuery, ...filters.cuisines].filter(Boolean).join(' ')
    fetchNearby({
      lat: userLocation.lat,
      lng: userLocation.lng,
      radius: filters.radius,
      keyword,
      minRating: filters.minRating,
      priceLevels: filters.priceLevels,
    })
  }, [userLocation, filters.radius, filters.minRating, filters.priceLevels, fetchNearby])

  const handleSearchChange = useCallback(
    (query) => {
      setSearchQuery(query)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = setTimeout(() => {
        if (!userLocation) return
        const keyword = [query, ...filters.cuisines].filter(Boolean).join(' ')
        fetchNearby({
          lat: userLocation.lat,
          lng: userLocation.lng,
          radius: filters.radius,
          keyword,
          minRating: filters.minRating,
          priceLevels: filters.priceLevels,
        })
      }, 500)
    },
    [userLocation, filters, fetchNearby]
  )

  const handleFilterChange = useCallback(
    (updates) => {
      const next = { ...filters, ...updates }
      setFilters(next)
      updateProfile({ filters: next, cuisines: updates.cuisines ?? filters.cuisines })

      // Re-fetch immediately for cuisine changes
      if (updates.cuisines !== undefined && userLocation) {
        const keyword = [searchQuery, ...(updates.cuisines)].filter(Boolean).join(' ')
        fetchNearby({
          lat: userLocation.lat,
          lng: userLocation.lng,
          radius: next.radius,
          keyword,
          minRating: next.minRating,
          priceLevels: next.priceLevels,
        })
      }
    },
    [filters, updateProfile, userLocation, searchQuery, fetchNearby]
  )

  const handleVisited = useCallback(
    (place) => {
      addVisited({
        place_id: place.place_id,
        name: place.name,
        cuisine: profile.cuisines[0] || '',
        price_level: place.price_level || 0,
        rating: place.rating || 0,
      })
    },
    [addVisited, profile.cuisines]
  )

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 bg-gray-950 border-b border-gray-800 flex items-center px-4 gap-4 shrink-0 z-20">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-amber-400 text-xl">🔥</span>
          <span className="text-white font-bold text-lg tracking-tight">Nawala</span>
        </div>

        <div className="flex-1 max-w-lg">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search restaurants, cuisine…"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-gray-500 outline-none focus:border-amber-500 transition-colors"
            />
            {placesLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {locationError && (
            <span className="text-gray-500 text-xs hidden sm:block">{locationError}</span>
          )}
          <div className="text-gray-400 text-xs bg-gray-800 px-2.5 py-1 rounded-lg">
            {places.length} places
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        <FilterSidebar
          filters={filters}
          onChange={handleFilterChange}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />

        <div className="flex-1 flex relative overflow-hidden">
          <MapView
            places={places}
            onPlaceSelect={setSelectedPlace}
            selectedPlaceId={selectedPlace?.place_id}
            userLocation={userLocation}
            filters={filters}
          />

          <ForYouSection
            userLocation={userLocation}
            userProfile={profile}
            onPlaceSelect={setSelectedPlace}
            selectedPlaceId={selectedPlace?.place_id}
          />

          {placesError && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-900/80 text-red-200 text-xs px-4 py-2 rounded-xl border border-red-700">
              {placesError}
            </div>
          )}
        </div>

        {selectedPlace && (
          <DetailDrawer
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            onVisited={handleVisited}
            city=""
          />
        )}
      </div>

      <Chatbot userProfile={profile} />
    </div>
  )
}
