import { useState, useCallback } from 'react'

const STORAGE_KEY = 'nawala_profile'

const DEFAULT_PROFILE = {
  userId: crypto.randomUUID(),
  budget: { min: 0, max: 50 },
  dietary: 'both',
  cuisines: [],
  visited_places: [],
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PROFILE
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_PROFILE, ...parsed }
  } catch {
    return DEFAULT_PROFILE
  }
}

function save(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export function useUserProfile() {
  const [profile, setProfile] = useState(load)

  const updateProfile = useCallback((updates) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates }
      save(next)
      return next
    })
  }, [])

  const addVisited = useCallback(
    async (place) => {
      setProfile((prev) => {
        const already = prev.visited_places.some((p) => p.place_id === place.place_id)
        if (already) return prev
        const next = {
          ...prev,
          visited_places: [place, ...prev.visited_places].slice(0, 50),
        }
        save(next)
        return next
      })

      try {
        await fetch('/api/profile/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: profile.userId,
            place_id: place.place_id,
            name: place.name || '',
            cuisine: place.cuisine || '',
            price_level: place.price_level || 0,
            rating: place.rating || 0,
          }),
        })
      } catch {
        // fail silently — local state already updated
      }
    },
    [profile.userId]
  )

  return { profile, updateProfile, addVisited }
}
