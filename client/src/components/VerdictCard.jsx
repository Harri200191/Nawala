import { useState, useEffect } from 'react'
import { fetchVerdict } from '../utils/claudeApi'

export default function VerdictCard({ place, redditSnippets = [] }) {
  const [verdict, setVerdict] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cached, setCached] = useState(false)

  useEffect(() => {
    if (!place?.place_id) return
    setVerdict(null)
    setError(null)

    const load = async () => {
      setLoading(true)
      try {
        const reviews = (place.reviews || []).slice(0, 3).map((r) => r.text || r)
        const result = await fetchVerdict({
          placeId: place.place_id,
          name: place.name,
          address: place.formatted_address || '',
          rating: place.rating || 0,
          priceLevel: place.price_level || 0,
          reviews,
          redditSnippets,
        })
        setVerdict(result.verdict)
        setCached(result.cached)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [place?.place_id])

  if (loading) {
    return (
      <div className="bg-gray-800/60 rounded-2xl p-5 border border-gray-700 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-amber-400 text-sm font-medium">Generating AI Verdict…</span>
        </div>
        <div className="space-y-2">
          {[80, 60, 70, 55].map((w, i) => (
            <div key={i} className={`h-3 bg-gray-700 rounded animate-pulse`} style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-2xl p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!verdict) return null

  const lines = verdict.split('\n').filter(Boolean)

  return (
    <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/20 rounded-2xl p-5 border border-amber-700/40 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">✦</span>
          <span className="text-amber-300 font-semibold text-sm">AI Verdict</span>
        </div>
        {cached && (
          <span className="text-gray-500 text-xs bg-gray-800 px-2 py-0.5 rounded-full">cached</span>
        )}
      </div>
      <div className="space-y-2">
        {lines.map((line, i) => {
          const [label, ...rest] = line.split(':')
          const content = rest.join(':').trim()
          if (content) {
            return (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-amber-500 font-medium shrink-0 min-w-[80px]">{label}:</span>
                <span className="text-gray-200">{content}</span>
              </div>
            )
          }
          return <p key={i} className="text-gray-200 text-sm">{line}</p>
        })}
      </div>
    </div>
  )
}
