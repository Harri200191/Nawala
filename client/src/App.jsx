import { useState, useEffect, useCallback } from 'react'
import MapView from './components/MapView'
import FilterSidebar from './components/FilterSidebar'
import DetailDrawer from './components/DetailDrawer'
import Chatbot from './components/Chatbot'
import ForYouSection from './components/ForYouSection'
import SearchBar from './components/SearchBar'
import { usePlaces } from './hooks/usePlaces'
import { useUserProfile } from './hooks/useUserProfile'
import { useCurrency } from './hooks/useCurrency'

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
  const [userLocation, setUserLocation] = useState(null)   // GPS dot on map (never changes)
  const [searchCenter, setSearchCenter] = useState(null)   // center for Places queries (can be overridden)
  const [locationError, setLocationError] = useState(null)

  const { places, loading: placesLoading, error: placesError, fetchNearby } = usePlaces()
  const { profile, updateProfile, addVisited } = useUserProfile()
  const { countryCode } = useCurrency()

  // Get GPS location once
  useEffect(() => {
    if (!navigator.geolocation) {
      const fallback = { lat: 24.8607, lng: 67.0011 }
      setUserLocation(fallback)
      setSearchCenter(fallback)
      setLocationError('Geolocation not supported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setSearchCenter(loc)
      },
      () => {
        const fallback = { lat: 24.8607, lng: 67.0011 }
        setUserLocation(fallback)
        setSearchCenter(fallback)
        setLocationError('Location access denied — showing default area')
      },
      { timeout: 8000 }
    )
  }, [])

  // Re-fetch when searchCenter or key filters change
  const doFetch = useCallback(
    (center, overrideFilters) => {
      if (!center) return
      const f = overrideFilters || filters
      const keyword = f.cuisines.join(' ')
      fetchNearby({
        lat: center.lat,
        lng: center.lng,
        radius: f.radius,
        keyword,
        minRating: f.minRating,
        priceLevels: f.priceLevels,
      })
    },
    [filters, fetchNearby]
  )

  useEffect(() => {
    doFetch(searchCenter)
  }, [searchCenter, filters.radius, filters.minRating, filters.priceLevels])

  // SearchBar callbacks
  const handlePlaceSelect = useCallback((place) => {
    // User picked a restaurant from autocomplete — show it in the drawer directly
    setSelectedPlace(place)
    // Also pan the search center to its location so nearby results update
    const loc = place.geometry?.location
    if (loc) {
      const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat
      const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng
      setSearchCenter({ lat, lng })
    }
  }, [])

  const handleLocationChange = useCallback((loc) => {
    // User searched a city/landmark — pan there and re-fetch
    setSearchCenter(loc)
  }, [])

  const handleFilterChange = useCallback(
    (updates) => {
      const next = { ...filters, ...updates }
      setFilters(next)
      updateProfile({ filters: next, cuisines: updates.cuisines ?? filters.cuisines })
      if (updates.cuisines !== undefined) {
        doFetch(searchCenter, next)
      }
    },
    [filters, updateProfile, searchCenter, doFetch]
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

        <div className="flex-1 max-w-xl">
          <SearchBar
            onPlaceSelect={handlePlaceSelect}
            onLocationChange={handleLocationChange}
            loading={placesLoading}
          />
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
          countryCode={countryCode}
        />

        <div className="flex-1 flex relative overflow-hidden">
          <MapView
            places={places}
            onPlaceSelect={setSelectedPlace}
            selectedPlaceId={selectedPlace?.place_id}
            userLocation={userLocation}
            searchCenter={searchCenter}
            filters={filters}
          />

          <ForYouSection
            userLocation={searchCenter}
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
            countryCode={countryCode}
          />
        )}
      </div>

      <Chatbot userProfile={profile} />
    </div>
  )
}
