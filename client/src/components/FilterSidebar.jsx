import { useState } from 'react'
import { getCurrencyInfo } from '../utils/currency'

const CUISINE_OPTIONS = [
  'Desi', 'Chinese', 'Fast Food', 'Cafe', 'BBQ',
  'Pizza', 'Burgers', 'Seafood', 'Italian', 'Thai',
  'Mexican', 'Sushi', 'Bakery', 'Desserts',
]

function RangeSlider({ label, min, max, value, onChange, format }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-300 text-sm font-medium">{label}</span>
        <span className="text-amber-400 text-xs font-mono">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-gray-700 accent-amber-500 cursor-pointer"
      />
      <div className="flex justify-between text-gray-600 text-xs">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}

// Slider + free-type inputs, no upper limit
function FreeRangeInput({ label, value, onChange, prefix = '', suffix = '', sliderMax }) {
  const [loStr, setLoStr] = useState(String(value[0]))
  const [hiStr, setHiStr] = useState(String(value[1]))

  // Keep local string state in sync if parent resets the values
  useState(() => { setLoStr(String(value[0])); setHiStr(String(value[1])) })

  const commit = (lo, hi) => {
    const loN = Math.max(0, Number(lo) || 0)
    const hiN = Math.max(loN, Number(hi) || 0)
    onChange([loN, hiN])
  }

  const dynMax = Math.max(sliderMax, value[1])

  const loFrac = Math.min(value[0] / dynMax, 1)
  const hiFrac = Math.min(value[1] / dynMax, 1)

  return (
    <div className="space-y-2.5">
      <span className="text-gray-300 text-sm font-medium">{label}</span>

      {/* Free-type number inputs */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center bg-gray-800 border border-gray-700 rounded-xl px-2.5 py-1.5 gap-1 focus-within:border-amber-500 transition-colors">
          {prefix && <span className="text-gray-500 text-xs shrink-0">{prefix}</span>}
          <input
            type="number"
            min={0}
            value={loStr}
            onChange={(e) => setLoStr(e.target.value)}
            onBlur={() => { commit(loStr, hiStr); setLoStr(String(Math.max(0, Number(loStr) || 0))) }}
            className="w-full bg-transparent text-white text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="Min"
          />
          {suffix && <span className="text-gray-500 text-xs shrink-0">{suffix}</span>}
        </div>

        <span className="text-gray-600 text-xs">–</span>

        <div className="flex-1 flex items-center bg-gray-800 border border-gray-700 rounded-xl px-2.5 py-1.5 gap-1 focus-within:border-amber-500 transition-colors">
          {prefix && <span className="text-gray-500 text-xs shrink-0">{prefix}</span>}
          <input
            type="number"
            min={0}
            value={hiStr}
            onChange={(e) => setHiStr(e.target.value)}
            onBlur={() => { commit(loStr, hiStr); setHiStr(String(Math.max(Number(loStr) || 0, Number(hiStr) || 0))) }}
            className="w-full bg-transparent text-white text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="Max"
          />
          {suffix && <span className="text-gray-500 text-xs shrink-0">{suffix}</span>}
        </div>
      </div>

      {/* Slider for quick adjustment */}
      <div className="relative h-5 flex items-center">
        <div className="absolute w-full h-1.5 bg-gray-700 rounded-full" />
        <div
          className="absolute h-1.5 bg-amber-500 rounded-full pointer-events-none"
          style={{ left: `${loFrac * 100}%`, right: `${(1 - hiFrac) * 100}%` }}
        />
        <input
          type="range"
          min={0}
          max={dynMax}
          value={value[0]}
          onChange={(e) => {
            const v = Number(e.target.value)
            const next = [v, Math.max(v, value[1])]
            onChange(next); setLoStr(String(next[0])); setHiStr(String(next[1]))
          }}
          className="absolute w-full appearance-none bg-transparent accent-amber-500 cursor-pointer"
        />
        <input
          type="range"
          min={0}
          max={dynMax}
          value={value[1]}
          onChange={(e) => {
            const v = Number(e.target.value)
            const next = [Math.min(value[0], v), v]
            onChange(next); setLoStr(String(next[0])); setHiStr(String(next[1]))
          }}
          className="absolute w-full appearance-none bg-transparent accent-amber-500 cursor-pointer"
        />
      </div>
    </div>
  )
}

export default function FilterSidebar({ filters, onChange, collapsed, onToggle, countryCode }) {
  console.log(countryCode)
  const { symbol } = getCurrencyInfo(countryCode)
  const toggleCuisine = (c) => {
    const next = filters.cuisines.includes(c)
      ? filters.cuisines.filter((x) => x !== c)
      : [...filters.cuisines, c]
    onChange({ cuisines: next })
  }

  if (collapsed) {
    return (
      <div className="w-12 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-4 gap-4">
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-amber-400 transition-colors"
          title="Expand filters"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4h18M6 12h12M9 20h6" />
          </svg>
        </button>
        <div className="flex flex-col gap-1 text-xs text-gray-600" style={{ writingMode: 'vertical-rl' }}>
          Filters
        </div>
      </div>
    )
  }

  return (
    <aside className="w-72 bg-gray-950 border-r border-gray-800 flex flex-col overflow-hidden">
      <div className="px-4 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4h18M6 12h12M9 20h6" />
          </svg>
          <span className="text-white font-semibold text-sm">Filters</span>
        </div>
        <button onClick={onToggle} className="text-gray-500 hover:text-gray-300 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-6">
        {/* Distance */}
        <RangeSlider
          label="Radius"
          min={500}
          max={10000}
          value={filters.radius}
          onChange={(v) => onChange({ radius: v })}
          format={(v) => `${(v / 1000).toFixed(1)} km`}
        />

        {/* Min Rating */}
        <RangeSlider
          label="Min Rating"
          min={1}
          max={5}
          value={filters.minRating}
          onChange={(v) => onChange({ minRating: v })}
          format={(v) => `${v}★`}
        />

        {/* Dietary */}
        <div className="space-y-2">
          <span className="text-gray-300 text-sm font-medium">Dietary</span>
          <div className="flex gap-2">
            {['both', 'veg', 'non-veg'].map((d) => (
              <button
                key={d}
                onClick={() => onChange({ dietary: d })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  filters.dietary === d
                    ? 'bg-amber-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {d === 'both' ? 'All' : d === 'veg' ? '🥗 Veg' : '🍗 Non-Veg'}
              </button>
            ))}
          </div>
        </div>

        {/* Cuisine */}
        <div className="space-y-2">
          <span className="text-gray-300 text-sm font-medium">Cuisine</span>
          <div className="flex flex-wrap gap-1.5">
            {CUISINE_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => toggleCuisine(c)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  filters.cuisines.includes(c)
                    ? 'bg-amber-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <FreeRangeInput
          label="Budget"
          value={filters.budget}
          onChange={(v) => onChange({ budget: v })}
          prefix={symbol}
          sliderMax={5000}
        />

        {/* Price Level */}
        <div className="space-y-2">
          <span className="text-gray-300 text-sm font-medium">Price Level</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((level) => (
              <button
                key={level}
                onClick={() => {
                  const next = filters.priceLevels.includes(level)
                    ? filters.priceLevels.filter((p) => p !== level)
                    : [...filters.priceLevels, level]
                  onChange({ priceLevels: next })
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  filters.priceLevels.includes(level)
                    ? 'bg-amber-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {symbol.repeat(level)}
              </button>
            ))}
          </div>
        </div>

        {/* Calorie Range (optional) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm font-medium">Calories</span>
            <button
              onClick={() => onChange({ caloriesEnabled: !filters.caloriesEnabled })}
              className={`w-8 h-4 rounded-full transition-all relative ${
                filters.caloriesEnabled ? 'bg-amber-500' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                  filters.caloriesEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {filters.caloriesEnabled && (
            <FreeRangeInput
              label=""
              value={filters.calories}
              onChange={(v) => onChange({ calories: v })}
              suffix=" kcal"
              sliderMax={3000}
            />
          )}
        </div>

        {/* Reset */}
        <button
          onClick={() =>
            onChange({
              radius: 2000,
              minRating: 0,
              dietary: 'both',
              cuisines: [],
              budget: [0, 100],
              priceLevels: [],
              caloriesEnabled: false,
              calories: [0, 2000],
            })
          }
          className="w-full py-2 rounded-xl bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 hover:text-white transition-all"
        >
          Reset Filters
        </button>
      </div>
    </aside>
  )
}
