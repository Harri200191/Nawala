import { useState, useCallback, useRef } from 'react'

export function usePlaces() {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const fetchNearby = useCallback(async ({ lat, lng, radius, keyword, minRating, priceLevels }) => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        lat,
        lng,
        radius: radius || 2000,
        keyword: keyword || '',
        min_rating: minRating || 0,
        price_levels: priceLevels ? priceLevels.join(',') : '',
      })

      const res = await fetch(`/api/places/nearby?${params}`, {
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPlaces(data.results || [])
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
        setPlaces([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return { places, loading, error, fetchNearby }
}
