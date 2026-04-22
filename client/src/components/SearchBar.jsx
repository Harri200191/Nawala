import { useState, useRef, useEffect, useCallback } from 'react'

const TYPE_ICONS = {
  restaurant: '🍽️',
  cafe: '☕',
  bar: '🍺',
  food: '🥘',
  locality: '📍',
  country: '🌍',
  default: '📍',
}

function getIcon(types = []) {
  for (const t of types) {
    if (TYPE_ICONS[t]) return TYPE_ICONS[t]
  }
  return TYPE_ICONS.default
}

function highlight(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-amber-400 font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function SearchBar({ onPlaceSelect, onLocationChange, loading }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const autocompleteRef = useRef(null)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // Init AutocompleteService once Google Maps is ready
  useEffect(() => {
    const init = () => {
      if (window.google?.maps?.places) {
        autocompleteRef.current = new window.google.maps.places.AutocompleteService()
      }
    }
    if (window.google?.maps?.places) { init(); return }
    const id = setInterval(() => {
      if (window.google?.maps?.places) { init(); clearInterval(id) }
    }, 300)
    return () => clearInterval(id)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        setOpen(false)
        setActiveIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchSuggestions = useCallback((val) => {
    if (!val.trim() || !autocompleteRef.current) {
      setSuggestions([])
      setOpen(false)
      return
    }
    autocompleteRef.current.getPlacePredictions(
      { input: val },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions?.length) {
          setSuggestions(predictions)
          setOpen(true)
          setActiveIdx(-1)
        } else {
          setSuggestions([])
          setOpen(false)
        }
      }
    )
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 220)
  }

  const selectSuggestion = useCallback((prediction) => {
    setQuery(prediction.description)
    setOpen(false)
    setSuggestions([])
    setActiveIdx(-1)

    // Resolve geometry + type via PlacesService
    const dummy = document.createElement('div')
    const svc = new window.google.maps.places.PlacesService(dummy)
    svc.getDetails(
      {
        placeId: prediction.place_id,
        fields: [
          'place_id', 'name', 'geometry', 'types', 'rating',
          'user_ratings_total', 'price_level', 'opening_hours',
          'vicinity', 'formatted_address', 'photos',
        ],
      },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) return

        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        const foodTypes = ['restaurant', 'food', 'cafe', 'bar', 'meal_takeaway', 'meal_delivery', 'bakery']
        const isFood = place.types?.some((t) => foodTypes.includes(t))

        if (isFood) {
          // Select this place directly in the drawer
          onPlaceSelect(place)
        } else {
          // Pan map to this location and search restaurants there
          onLocationChange({ lat, lng })
        }
      }
    )
  }, [onPlaceSelect, onLocationChange])

  const handleKeyDown = (e) => {
    if (!open || !suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0) selectSuggestion(suggestions[activeIdx])
      else { setOpen(false); /* let parent handle raw text search */ }
    }
    else if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1) }
  }

  const clearSearch = () => {
    setQuery('')
    setSuggestions([])
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length) setOpen(true) }}
          placeholder="Search any restaurant or place worldwide…"
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-8 py-2 text-white text-sm placeholder-gray-500 outline-none focus:border-amber-500 transition-colors"
          autoComplete="off"
          spellCheck={false}
        />

        {loading && !query && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        )}
        {query && (
          <button onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {suggestions.map((s, i) => {
            const mainText = s.structured_formatting?.main_text || s.description
            const subText = s.structured_formatting?.secondary_text || ''
            const icon = getIcon(s.types || [])

            return (
              <button
                key={s.place_id}
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s) }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  i === activeIdx ? 'bg-gray-800' : 'hover:bg-gray-800/60'
                } ${i > 0 ? 'border-t border-gray-800' : ''}`}
              >
                <span className="text-base shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p className="text-white text-sm leading-tight truncate">
                    {highlight(mainText, query)}
                  </p>
                  {subText && (
                    <p className="text-gray-500 text-xs mt-0.5 truncate">{subText}</p>
                  )}
                </div>
                {(s.types || []).some(t => ['restaurant','cafe','bar','food','bakery','meal_takeaway'].includes(t)) && (
                  <span className="ml-auto text-amber-500/70 text-xs shrink-0">restaurant</span>
                )}
              </button>
            )
          })}
          <div className="px-3 py-1.5 border-t border-gray-800 flex items-center gap-1.5">
            <svg className="w-3 h-3 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span className="text-gray-600 text-xs">Powered by Google Places</span>
          </div>
        </div>
      )}
    </div>
  )
}
