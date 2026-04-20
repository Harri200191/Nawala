import { useState } from 'react'

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

function DualRangeSlider({ label, min, max, value, onChange, format }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-300 text-sm font-medium">{label}</span>
        <span className="text-amber-400 text-xs font-mono">
          {format(value[0])} – {format(value[1])}
        </span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute w-full h-1.5 bg-gray-700 rounded-full" />
        <div
          className="absolute h-1.5 bg-amber-500 rounded-full"
          style={{
            left: `${((value[0] - min) / (max - min)) * 100}%`,
            right: `${100 - ((value[1] - min) / (max - min)) * 100}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value[0]}
          onChange={(e) => onChange([Math.min(Number(e.target.value), value[1] - 1), value[1]])}
          className="absolute w-full appearance-none bg-transparent accent-amber-500 cursor-pointer"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value[1]}
          onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0] + 1)])}
          className="absolute w-full appearance-none bg-transparent accent-amber-500 cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-gray-600 text-xs">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}

export default function FilterSidebar({ filters, onChange, collapsed, onToggle }) {
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
        <DualRangeSlider
          label="Budget"
          min={0}
          max={200}
          value={filters.budget}
          onChange={(v) => onChange({ budget: v })}
          format={(v) => `$${v}`}
        />

        {/* Price Level */}
        <div className="space-y-2">
          <span className="text-gray-300 text-sm font-medium">Price Level</span>
          <div className="flex gap-2">
            {[
              { level: 1, label: '$' },
              { level: 2, label: '$$' },
              { level: 3, label: '$$$' },
              { level: 4, label: '$$$$' },
            ].map(({ level, label }) => (
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
                {label}
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
            <DualRangeSlider
              label=""
              min={0}
              max={2000}
              value={filters.calories}
              onChange={(v) => onChange({ calories: v })}
              format={(v) => `${v} kcal`}
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
