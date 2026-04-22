export async function fetchRedditResults(name, city = '') {
  const params = new URLSearchParams({ name, city })
  const res = await fetch(`/api/search/reddit?${params}`)
  if (!res.ok) throw new Error(`Search API error: ${res.status}`)
  return res.json()
}

export async function fetchSocialResults(name, city = '') {
  const params = new URLSearchParams({ name, city })
  const res = await fetch(`/api/search/social?${params}`)
  if (!res.ok) throw new Error(`Search API error: ${res.status}`)
  return res.json()
}

export async function fetchMenuImages(name, city = '') {
  const params = new URLSearchParams({ name, city })
  const res = await fetch(`/api/search/menu?${params}`)
  if (!res.ok) throw new Error(`Search API error: ${res.status}`)
  return res.json()
}
