import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchSocialResults } from '../utils/serpApi'

// ─── URL parsing ──────────────────────────────────────────────────────────── //

function parseEmbed(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace('www.', '')

    // Instagram reel / post
    const igReel = url.match(/instagram\.com\/reel\/([A-Za-z0-9_-]+)/)
    if (igReel) return { type: 'instagram', embedUrl: `https://www.instagram.com/reel/${igReel[1]}/embed/`, url }

    const igPost = url.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/)
    if (igPost) return { type: 'instagram', embedUrl: `https://www.instagram.com/p/${igPost[1]}/embed/`, url }

    // TikTok
    const ttVideo = url.match(/tiktok\.com\/.*\/video\/(\d+)/)
    if (ttVideo) return { type: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${ttVideo[1]}`, url }

    // YouTube
    const ytWatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/)
    if (ytWatch) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytWatch[1]}?autoplay=0&mute=1`, url }

    return null
  } catch {
    return null
  }
}

function getPlatformIcon(type) {
  switch (type) {
    case 'instagram':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.72a4.85 4.85 0 01-1.01-.03z" />
        </svg>
      )
    case 'youtube':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
        </svg>
      )
    default:
      return null
  }
}

// ─── Single reel card ─────────────────────────────────────────────────────── //

function ReelCard({ item, isActive, index }) {
  const [loaded, setLoaded] = useState(false)
  const [showIframe, setShowIframe] = useState(false)
  const [playing, setPlaying] = useState(false)
  const iframeRef = useRef(null)
  const embed = parseEmbed(item.link)

  // Only load iframe when card is active (saves bandwidth)
  useEffect(() => {
    if (isActive && embed) {
      setShowIframe(true)
    }
  }, [isActive])

  const domain = (() => {
    try { return new URL(item.link).hostname.replace('www.', '') }
    catch { return '' }
  })()

  const platformType = embed?.type || 'web'

  if (embed) {
    return (
      <div className="relative w-full h-full bg-black flex flex-col snap-start shrink-0">
        {/* iframe embed */}
        <div className="flex-1 relative overflow-hidden">
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-500 text-xs">Loading {platformType}…</span>
            </div>
          )}
          {showIframe && (
            <iframe
              ref={iframeRef}
              src={embed.embedUrl}
              className={`w-full h-full border-0 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLoaded(true)}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              title={item.title}
            />
          )}
        </div>

        {/* Overlay info bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="flex items-start gap-2">
            <div className={`shrink-0 p-1 rounded-full ${
              platformType === 'instagram' ? 'text-pink-400' :
              platformType === 'tiktok' ? 'text-cyan-400' :
              'text-red-500'
            }`}>
              {getPlatformIcon(platformType)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium line-clamp-2 leading-relaxed">{item.title}</p>
              <p className="text-gray-400 text-xs mt-0.5">{domain}</p>
            </div>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Platform badge top-right */}
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            platformType === 'instagram' ? 'bg-pink-500/80 text-white' :
            platformType === 'tiktok' ? 'bg-cyan-500/80 text-white' :
            'bg-red-600/80 text-white'
          }`}>
            {platformType === 'instagram' ? 'Instagram' : platformType === 'tiktok' ? 'TikTok' : 'YouTube'}
          </span>
        </div>
      </div>
    )
  }

  // Fallback card for non-embeddable URLs
  return (
    <div className="w-full h-full bg-gray-900 flex flex-col snap-start shrink-0">
      {item.thumbnail ? (
        <div className="flex-1 relative overflow-hidden">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="flex-1 bg-gray-800 flex items-center justify-center">
          <div className="text-5xl opacity-30">📱</div>
        </div>
      )}

      <div className="p-4 space-y-2 bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">{domain}</span>
          {item.thumbnail && (
            <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-full">Web result</span>
          )}
        </div>
        <p className="text-white text-sm font-medium line-clamp-3">{item.title}</p>
        {item.snippet && <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{item.snippet}</p>}
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-amber-400 text-xs hover:underline"
        >
          Open link
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  )
}

// ─── Main feed ────────────────────────────────────────────────────────────── //

export default function SocialReelsFeed({ name, city }) {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [fetchedAt, setFetchedAt] = useState(null)
  const feedRef = useRef(null)
  const observerRef = useRef(null)

  useEffect(() => {
    if (!name) return
    setResults(null)
    setLoading(true)
    setError(null)
    setActiveIndex(0)

    fetchSocialResults(name, city)
      .then((data) => {
        setResults(data.results || [])
        setFetchedAt(data.fetched_at)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [name])

  // IntersectionObserver — track which slide is in view
  useEffect(() => {
    if (!feedRef.current || !results?.length) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.index)
            setActiveIndex(idx)
          }
        })
      },
      { root: feedRef.current, threshold: 0.6 }
    )

    const children = feedRef.current.querySelectorAll('[data-index]')
    children.forEach((el) => observerRef.current.observe(el))

    return () => observerRef.current?.disconnect()
  }, [results])

  const scrollTo = useCallback((idx) => {
    const feed = feedRef.current
    if (!feed) return
    const child = feed.querySelector(`[data-index="${idx}"]`)
    child?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 bg-gray-900">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Searching social…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  if (!results) return null

  if (results.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 bg-gray-900 text-center p-6">
        <div className="text-4xl opacity-40">📱</div>
        <p className="text-gray-400 text-sm">No social content found for this place.</p>
        <p className="text-gray-600 text-xs">Try adding SERP_API_KEY to unlock social search.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Note bar */}
      <div className="px-3 py-2 bg-gray-900/90 border-b border-gray-800 flex items-center justify-between shrink-0">
        <span className="text-gray-500 text-xs">
          Web results — tap to view on platform
        </span>
        {fetchedAt && (
          <span className="text-gray-700 text-xs">
            {new Date(fetchedAt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Reel feed — vertical scroll snap */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {results.map((item, i) => (
          <div
            key={i}
            data-index={i}
            className="w-full snap-start"
            style={{ height: '100%', minHeight: '100%', scrollSnapAlign: 'start' }}
          >
            <ReelCard item={item} isActive={activeIndex === i} index={i} />
          </div>
        ))}
      </div>

      {/* Dot navigation */}
      <div className="flex items-center justify-center gap-1.5 py-2 bg-black shrink-0">
        {results.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`rounded-full transition-all ${
              i === activeIndex ? 'w-4 h-1.5 bg-amber-400' : 'w-1.5 h-1.5 bg-gray-600 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
