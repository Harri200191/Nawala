import { useState, useEffect } from 'react'
import { getCurrencyInfo } from '../utils/currency'

// Intl timezone → country code (covers 95%+ of users synchronously)
const TIMEZONE_COUNTRY = {
  'Asia/Karachi': 'PK',
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
  'America/Honolulu': 'US',
  'Europe/London': 'GB',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Europe/Istanbul': 'TR',
  'Asia/Dhaka': 'BD',
  'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'CN',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'Europe/Berlin': 'DE', 'Europe/Paris': 'FR', 'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH', 'Europe/Lisbon': 'PT',
  'Europe/Warsaw': 'PL', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI',
  'Africa/Lagos': 'NG', 'Africa/Cairo': 'EG', 'Africa/Johannesburg': 'ZA',
  'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Bangkok': 'TH',
  'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH',
  'America/Sao_Paulo': 'BR', 'America/Manaus': 'BR',
  'America/Mexico_City': 'MX',
  'Asia/Muscat': 'OM',
  'Asia/Kuwait': 'KW',
  'Asia/Qatar': 'QA', 'Asia/Doha': 'QA',
  'Asia/Bahrain': 'BH',
  'Asia/Colombo': 'LK',
  'Asia/Kathmandu': 'NP',
  'Asia/Kabul': 'AF',
  'Asia/Tehran': 'IR',
  'Asia/Baghdad': 'IQ',
  'Asia/Beirut': 'LB',
  'Asia/Amman': 'JO',
  'Asia/Jerusalem': 'IL',
  'Africa/Nairobi': 'KE',
  'Europe/Moscow': 'RU',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
  'America/Santiago': 'CL',
}

function detectFromTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TIMEZONE_COUNTRY[tz] || ''
  } catch {
    return ''
  }
}

const SESSION_KEY = 'nawala_country_code'

export function useCurrency() {
  const [countryCode, setCountryCode] = useState(() => {
    // 1. Cached from previous fetch this session
    const cached = sessionStorage.getItem(SESSION_KEY)
    if (cached) return cached
    // 2. Synchronous timezone detection — works immediately, no network
    return detectFromTimezone()
  })

  const [currencyInfo, setCurrencyInfo] = useState(() =>
    getCurrencyInfo(sessionStorage.getItem(SESSION_KEY) || detectFromTimezone())
  )

  // Fire-and-forget ipapi.co to confirm/refine (e.g. if on VPN)
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return // already confirmed

    fetch('https://ipapi.co/json/')
      .then((r) => r.json())
      .then((data) => {
        const code = (data.country_code || '').toUpperCase()
        if (code) {
          sessionStorage.setItem(SESSION_KEY, code)
          setCountryCode(code)
          setCurrencyInfo(getCurrencyInfo(code))
        }
      })
      .catch(() => {
        // timezone detection is good enough — already set in useState init
      })
  }, [])

  return { countryCode, currencyInfo }
}
