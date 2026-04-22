// country code → { currency, locale, symbol }
const COUNTRY_CURRENCY = {
  PK: { currency: 'PKR', locale: 'ur-PK', symbol: 'Rs' },
  IN: { currency: 'INR', locale: 'en-IN', symbol: '₹' },
  US: { currency: 'USD', locale: 'en-US', symbol: '$' },
  GB: { currency: 'GBP', locale: 'en-GB', symbol: '£' },
  AE: { currency: 'AED', locale: 'ar-AE', symbol: 'د.إ' },
  SA: { currency: 'SAR', locale: 'ar-SA', symbol: '﷼' },
  TR: { currency: 'TRY', locale: 'tr-TR', symbol: '₺' },
  BD: { currency: 'BDT', locale: 'bn-BD', symbol: '৳' },
  CN: { currency: 'CNY', locale: 'zh-CN', symbol: '¥' },
  JP: { currency: 'JPY', locale: 'ja-JP', symbol: '¥' },
  KR: { currency: 'KRW', locale: 'ko-KR', symbol: '₩' },
  AU: { currency: 'AUD', locale: 'en-AU', symbol: 'A$' },
  CA: { currency: 'CAD', locale: 'en-CA', symbol: 'C$' },
  EU: { currency: 'EUR', locale: 'en-DE', symbol: '€' },
  DE: { currency: 'EUR', locale: 'de-DE', symbol: '€' },
  FR: { currency: 'EUR', locale: 'fr-FR', symbol: '€' },
  IT: { currency: 'EUR', locale: 'it-IT', symbol: '€' },
  ES: { currency: 'EUR', locale: 'es-ES', symbol: '€' },
  NG: { currency: 'NGN', locale: 'en-NG', symbol: '₦' },
  EG: { currency: 'EGP', locale: 'ar-EG', symbol: 'E£' },
  SG: { currency: 'SGD', locale: 'en-SG', symbol: 'S$' },
  MY: { currency: 'MYR', locale: 'ms-MY', symbol: 'RM' },
  TH: { currency: 'THB', locale: 'th-TH', symbol: '฿' },
  ID: { currency: 'IDR', locale: 'id-ID', symbol: 'Rp' },
  PH: { currency: 'PHP', locale: 'en-PH', symbol: '₱' },
  BR: { currency: 'BRL', locale: 'pt-BR', symbol: 'R$' },
  MX: { currency: 'MXN', locale: 'es-MX', symbol: 'MX$' },
  ZA: { currency: 'ZAR', locale: 'en-ZA', symbol: 'R' },
  OM: { currency: 'OMR', locale: 'ar-OM', symbol: 'ر.ع.' },
  KW: { currency: 'KWD', locale: 'ar-KW', symbol: 'د.ك' },
  QA: { currency: 'QAR', locale: 'ar-QA', symbol: 'ر.ق' },
  BH: { currency: 'BHD', locale: 'ar-BH', symbol: '.د.ب' },
}

const DEFAULT = { currency: 'USD', locale: 'en-US', symbol: '$' }

// Google price_level 1–4 mapped to approximate local price range
const PRICE_RANGES = {
  PKR: [300, 800, 2000, 5000],
  INR: [150, 400, 1000, 2500],
  USD: [5, 15, 35, 80],
  GBP: [4, 12, 30, 70],
  AED: [15, 50, 120, 300],
  SAR: [15, 50, 120, 300],
  TRY: [50, 150, 400, 1000],
  EUR: [5, 15, 35, 80],
  AUD: [8, 20, 45, 100],
  SGD: [8, 20, 50, 120],
  BRL: [20, 60, 150, 400],
  MXN: [80, 250, 600, 1500],
  ZAR: [60, 150, 400, 1000],
}

export function getCurrencyInfo(countryCode) {
  return COUNTRY_CURRENCY[countryCode] || DEFAULT
}

export function formatPrice(amount, countryCode) {
  const info = getCurrencyInfo(countryCode)
  try {
    return new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: info.currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${info.symbol}${amount}`
  }
}

export function priceLevelToRange(priceLevel, countryCode) {
  const info = getCurrencyInfo(countryCode)
  const ranges = PRICE_RANGES[info.currency] || PRICE_RANGES.USD
  if (!priceLevel || priceLevel < 1) return null
  const idx = Math.min(priceLevel - 1, ranges.length - 1)
  const lo = idx === 0 ? 0 : ranges[idx - 1]
  const hi = ranges[idx]
  return `${info.symbol}${lo}–${info.symbol}${hi}`
}

export function priceLevelLabel(priceLevel, countryCode) {
  if (!priceLevel) return null
  const info = getCurrencyInfo(countryCode)
  return info.symbol.repeat(priceLevel)
}
