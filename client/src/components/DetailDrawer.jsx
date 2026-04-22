import { useState, useEffect } from 'react'
import VerdictCard from './VerdictCard'
import SocialReelsFeed from './SocialReelsFeed'
import { fetchRedditResults, fetchMenuImages } from '../utils/serpApi'
import { priceLevelLabel, priceLevelToRange } from '../utils/currency'

const TABS = ['Overview', 'Menu', 'Reddit', 'Social', 'AI Verdict']

function StarRating({ rating, count }) {
  const stars = Math.round(rating || 0)
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} className={`w-4 h-4 ${i <= stars ? 'text-amber-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-amber-400 font-semibold text-sm">{rating?.toFixed(1)}</span>
      {count && <span className="text-gray-500 text-xs">({count.toLocaleString()} reviews)</span>}
    </div>
  )
}

function OverviewTab({ place, onVisited, countryCode }) {
  if (!place) return null
  const isOpen = place.opening_hours?.open_now
  const todayHours = place.opening_hours?.weekday_text?.[new Date().getDay()]
  const priceSymbol = priceLevelLabel(place.price_level, countryCode)
  const priceRange = priceLevelToRange(place.price_level, countryCode)

  return (
    <div className="space-y-5 p-4">
      <div className="space-y-1">
        <h2 className="text-white text-xl font-bold">{place.name}</h2>
        <p className="text-gray-400 text-sm">{place.formatted_address}</p>
        {place.editorial_summary?.overview && (
          <p className="text-gray-500 text-xs italic">{place.editorial_summary.overview}</p>
        )}
        {place.opening_hours && (
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {isOpen ? 'Open Now' : 'Closed'}
            </span>
            {todayHours && <span className="text-gray-500 text-xs">{todayHours}</span>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <StarRating rating={place.rating} count={place.user_ratings_total} />
        {priceSymbol && (
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-medium text-sm bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {priceSymbol}
            </span>
            {priceRange && (
              <span className="text-gray-500 text-xs">{priceRange} per person</span>
            )}
          </div>
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
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 text-sm transition-all"
            >
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
              Website
            </a>
          )}
        </div>
      )}

      {place.reviews?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-gray-300 text-sm font-semibold uppercase tracking-wider">Top Reviews</h3>
          {place.reviews.slice(0, 3).map((review, i) => (
            <div key={i} className="bg-gray-800/60 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {review.profile_photo_url && (
                    <img src={review.profile_photo_url} alt="" className="w-5 h-5 rounded-full" onError={(e) => e.target.remove()} />
                  )}
                  <span className="text-white text-xs font-medium">{review.author_name}</span>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-amber-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              {review.relative_time_description && (
                <span className="text-gray-600 text-xs">{review.relative_time_description}</span>
              )}
              <p className="text-gray-400 text-xs leading-relaxed line-clamp-4">{review.text}</p>
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

// ─── Reddit tab ──────────────────────────────────────────────────────────── //

function RedditPostCard({ item }) {
  const subreddit = item.link?.match(/\/r\/([^/?#]+)/i)?.[1]
  const isReddit = item.link?.includes('reddit.com')

  return (
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/40 overflow-hidden">
      {/* Post meta */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="10" r="10" fill="#FF4500" />
            <path d="M16.67 10a1.46 1.46 0 00-2.47-1 7.12 7.12 0 00-3.85-1.23l.65-3.08 2.13.45a1 1 0 101.07-1 1 1 0 00-.96.68l-2.38-.5a.27.27 0 00-.32.2l-.73 3.44a7.14 7.14 0 00-3.89 1.23 1.46 1.46 0 10-1.61 2.39 2.87 2.87 0 000 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 000-.44 1.46 1.46 0 00.61-1.18zM7 11a1 1 0 111 1 1 1 0 01-1-1zm5.37 2.71a3.39 3.39 0 01-2.37.74 3.39 3.39 0 01-2.37-.74.26.26 0 01.37-.37 2.84 2.84 0 002 .59 2.84 2.84 0 002-.59.26.26 0 01.37.37zm-.37-1.71a1 1 0 111-1 1 1 0 01-1 1z"
              fill="white" />
          </svg>
        </div>
        {subreddit && (
          <span className="text-orange-400 text-xs font-semibold">r/{subreddit}</span>
        )}
        {item.date && <span className="text-gray-600 text-xs ml-auto">{item.date}</span>}
      </div>

      {/* Title */}
      <p className="px-4 text-white text-sm font-semibold leading-snug">{item.title}</p>

      {/* Snippet — the actual content, prominently displayed */}
      {item.snippet && (
        <div className="mx-4 mt-2 mb-3 bg-gray-900/60 rounded-xl p-3 border-l-2 border-orange-500/60">
          <p className="text-gray-200 text-sm leading-relaxed">{item.snippet}</p>
        </div>
      )}

      {/* Link as secondary action */}
      <div className="px-4 pb-3">
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-orange-400/80 hover:text-orange-400 text-xs transition-colors"
        >
          {isReddit ? 'View full thread on Reddit' : 'Read more'}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  )
}

function RedditTab({ name, city }) {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)

  useEffect(() => {
    if (!name) return
    setResults(null)
    setLoading(true)
    fetchRedditResults(name, city)
      .then((data) => { setResults(data.results); setFetchedAt(data.fetched_at) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [name])

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-gray-300 text-sm font-semibold">What Reddit says</h3>
        {fetchedAt && (
          <span className="text-gray-600 text-xs">
            {new Date(fetchedAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {loading && [1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-800/60 rounded-2xl p-4 space-y-2 animate-pulse">
          <div className="flex gap-2"><div className="h-3 bg-gray-700 rounded-full w-16" /><div className="h-3 bg-gray-700 rounded-full w-24" /></div>
          <div className="h-3 bg-gray-700 rounded w-5/6" />
          <div className="h-12 bg-gray-700/50 rounded-xl" />
        </div>
      ))}

      {error && <div className="bg-red-900/20 border border-red-800 rounded-xl p-3"><p className="text-red-400 text-sm">{error}</p></div>}
      {results?.length === 0 && !loading && <div className="text-center py-8"><p className="text-gray-500 text-sm">No Reddit discussions found</p></div>}
      {results?.map((item, i) => <RedditPostCard key={i} item={item} />)}
    </div>
  )
}

// ─── Menu tab ─────────────────────────────────────────────────────────────── //

function MenuTab({ name, city }) {
  const [images, setImages] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lightbox, setLightbox] = useState(null) // index of open image

  useEffect(() => {
    if (!name) return
    setImages(null)
    setLoading(true)
    fetchMenuImages(name, city)
      .then((data) => setImages(data.images || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [name])

  // Close lightbox on Escape
  useEffect(() => {
    if (lightbox === null) return
    const handler = (e) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight' && images) setLightbox((i) => Math.min(i + 1, images.length - 1))
      if (e.key === 'ArrowLeft') setLightbox((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, images])

  return (
    <div className="p-4">
      <h3 className="text-gray-300 text-sm font-semibold mb-3">Menu Photos</h3>

      {loading && (
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {images?.length === 0 && !loading && (
        <div className="text-center py-12 space-y-2">
          <div className="text-4xl">🍽️</div>
          <p className="text-gray-500 text-sm">No menu photos found</p>
        </div>
      )}

      {images?.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setLightbox(i)}
              className="aspect-square rounded-xl overflow-hidden bg-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 hover:opacity-90 transition-opacity"
            >
              <img
                src={img.thumbnail}
                alt={img.title || 'Menu photo'}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => { e.target.closest('button')?.remove() }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && images?.[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox((i) => Math.max(i - 1, 0)) }}
            disabled={lightbox === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-800/80 flex items-center justify-center text-white disabled:opacity-30 hover:bg-gray-700 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <img
            src={images[lightbox].original}
            alt={images[lightbox].title || 'Menu photo'}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => { e.target.src = images[lightbox].thumbnail }}
          />

          <button
            onClick={(e) => { e.stopPropagation(); setLightbox((i) => Math.min(i + 1, images.length - 1)) }}
            disabled={lightbox === images.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-800/80 flex items-center justify-center text-white disabled:opacity-30 hover:bg-gray-700 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-800/80 flex items-center justify-center text-white hover:bg-gray-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gray-400 text-xs">
            {lightbox + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DetailDrawer({ place, onClose, onVisited, city = '', countryCode = '' }) {
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

  // Social tab (index 3) needs full height — no overflow wrapper
  const isSocialTab = activeTab === 3

  return (
    <div className="w-96 bg-gray-950 border-l border-gray-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
        <span className="text-white font-semibold text-sm truncate">{place.name}</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors shrink-0 ml-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Photo — hidden on social tab to maximise reel space */}
      {!isSocialTab && merged?.photos?.[0] && import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
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
              activeTab === i ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={`flex-1 ${isSocialTab ? '' : 'overflow-y-auto scrollbar-hide'} overflow-hidden`}>
        {loadingDetails && activeTab === 0 ? (
          <div className="p-4 space-y-4 animate-pulse">
            <div className="h-5 bg-gray-800 rounded w-3/4" />
            <div className="h-3 bg-gray-800 rounded w-1/2" />
            <div className="h-3 bg-gray-800 rounded w-2/3" />
          </div>
        ) : (
          <>
            {activeTab === 0 && <OverviewTab place={merged} onVisited={onVisited} countryCode={countryCode} />}
            {activeTab === 1 && <MenuTab name={place.name} city={city} />}
            {activeTab === 2 && <RedditTab name={place.name} city={city} />}
            {activeTab === 3 && <SocialReelsFeed name={place.name} city={city} />}
            {activeTab === 4 && (
              <div className="p-4 overflow-y-auto scrollbar-hide h-full">
                <VerdictCard place={merged} redditSnippets={[]} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
