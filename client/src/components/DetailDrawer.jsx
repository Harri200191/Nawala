import { useState, useEffect } from 'react'
import VerdictCard from './VerdictCard'
import { fetchRedditResults, fetchSocialResults } from '../utils/serpApi'

const PRICE_LABEL = ['', '$', '$$', '$$$', '$$$$']
const TABS = ['Overview', 'Reddit', 'Social', 'AI Verdict']

function StarRating({ rating, count }) {
  const stars = Math.round(rating || 0)
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${i <= stars ? 'text-amber-400' : 'text-gray-600'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-amber-400 font-semibold text-sm">{rating?.toFixed(1)}</span>
      {count && <span className="text-gray-500 text-xs">({count.toLocaleString()} reviews)</span>}
    </div>
  )
}

function OverviewTab({ place, onVisited }) {
  if (!place) return null

  const isOpen = place.opening_hours?.open_now
  const todayHours = place.opening_hours?.weekday_text?.[new Date().getDay()]

  return (
    <div className="space-y-5 p-4">
      <div className="space-y-1">
        <h2 className="text-white text-xl font-bold">{place.name}</h2>
        <p className="text-gray-400 text-sm">{place.formatted_address}</p>
        {place.opening_hours && (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {isOpen ? 'Open Now' : 'Closed'}
            </span>
            {todayHours && <span className="text-gray-500 text-xs">{todayHours}</span>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <StarRating rating={place.rating} count={place.user_ratings_total} />
        {place.price_level && (
          <span className="text-emerald-400 font-medium text-sm bg-emerald-500/10 px-2 py-0.5 rounded-full">
            {PRICE_LABEL[place.price_level]}
          </span>
        )}
      </div>

      {(place.formatted_phone_number || place.website) && (
        <div className="flex gap-2 flex-wrap">
          {place.formatted_phone_number && (
            <a
              href={`tel:${place.formatted_phone_number}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 text-sm transition-all"
            >
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {place.formatted_phone_number}
            </a>
          )}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.name + ' ' + (place.formatted_address || ''))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 text-sm transition-all"
          >
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Directions
          </a>
        </div>
      )}

      {place.reviews?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-gray-300 text-sm font-semibold uppercase tracking-wider">Top Reviews</h3>
          {place.reviews.slice(0, 3).map((review, i) => (
            <div key={i} className="bg-gray-800/60 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-white text-xs font-medium">{review.author_name}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-amber-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{review.text}</p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onVisited(place)}
        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl text-sm transition-all"
      >
        ✓ Mark as Visited
      </button>
    </div>
  )
}

function ResultCard({ item }) {
  const domain = (() => {
    try { return new URL(item.link).hostname.replace('www.', '') }
    catch { return item.source }
  })()

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-gray-800/60 hover:bg-gray-800 rounded-xl p-3 border border-gray-700/50 hover:border-gray-600 transition-all space-y-1"
    >
      <div className="flex items-start gap-2">
        {item.thumbnail && (
          <img src={item.thumbnail} alt="" className="w-10 h-10 rounded object-cover shrink-0" onError={(e) => e.target.remove()} />
        )}
        <div className="min-w-0">
          <p className="text-white text-sm font-medium line-clamp-2">{item.title}</p>
          <p className="text-amber-500 text-xs mt-0.5">{domain}</p>
        </div>
      </div>
      {item.snippet && <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{item.snippet}</p>}
    </a>
  )
}

function SearchTab({ type, name, city }) {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)

  useEffect(() => {
    if (!name) return
    setResults(null)
    setError(null)
    setLoading(true)

    const fetcher = type === 'reddit' ? fetchRedditResults : fetchSocialResults
    fetcher(name, city)
      .then((data) => {
        setResults(data.results)
        setFetchedAt(data.fetched_at)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [name, type])

  const label = type === 'reddit' ? 'Reddit & Web Buzz' : 'Social (Web Results)'
  const note =
    type === 'social'
      ? 'Direct social API access requires platform partnerships. These are web search results linking to social pages.'
      : null

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-300 text-sm font-semibold">{label}</h3>
        {fetchedAt && (
          <span className="text-gray-600 text-xs">
            Last searched: {new Date(fetchedAt * 1000).toLocaleTimeString()}
          </span>
        )}
      </div>

      {note && (
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-3">
          <p className="text-gray-500 text-xs">{note}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800/60 rounded-xl p-3 space-y-2 animate-pulse">
              <div className="h-3 bg-gray-700 rounded w-3/4" />
              <div className="h-2 bg-gray-700 rounded w-1/2" />
              <div className="h-2 bg-gray-700 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {results?.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No results found</p>
        </div>
      )}

      {results?.map((item, i) => <ResultCard key={i} item={item} />)}
    </div>
  )
}

export default function DetailDrawer({ place, onClose, onVisited, city = '' }) {
  const [activeTab, setActiveTab] = useState(0)
  const [details, setDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    if (!place?.place_id) return
    setDetails(null)
    setActiveTab(0)
    setLoadingDetails(true)

    fetch(`/api/places/details/${place.place_id}`)
      .then((r) => r.json())
      .then(setDetails)
      .catch(() => setDetails(place))
      .finally(() => setLoadingDetails(false))
  }, [place?.place_id])

  const merged = details || place

  if (!place) return null

  return (
    <div className="w-96 bg-gray-950 border-l border-gray-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-white font-semibold text-sm truncate">{place.name}</span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors shrink-0 ml-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Photo */}
      {merged?.photos?.[0] && import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
        <div className="h-36 bg-gray-800 shrink-0">
          <img
            src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${merged.photos[0].photo_reference}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`}
            alt={place.name}
            className="w-full h-full object-cover"
            onError={(e) => e.target.closest('.h-36')?.remove()}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800 shrink-0">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-2.5 text-xs font-medium transition-all ${
              activeTab === i
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loadingDetails && activeTab === 0 ? (
          <div className="p-4 space-y-4 animate-pulse">
            <div className="h-5 bg-gray-800 rounded w-3/4" />
            <div className="h-3 bg-gray-800 rounded w-1/2" />
            <div className="h-3 bg-gray-800 rounded w-2/3" />
          </div>
        ) : (
          <>
            {activeTab === 0 && <OverviewTab place={merged} onVisited={onVisited} />}
            {activeTab === 1 && <SearchTab type="reddit" name={place.name} city={city} />}
            {activeTab === 2 && <SearchTab type="social" name={place.name} city={city} />}
            {activeTab === 3 && (
              <div className="p-4">
                <VerdictCard
                  place={merged}
                  redditSnippets={[]}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
