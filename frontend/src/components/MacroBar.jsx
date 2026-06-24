const MACROS = [
  { key: 'protein', label: 'Protein', color: '#3b82f6', cal: 4 },
  { key: 'carbs',   label: 'Carbs',   color: '#10b981', cal: 4 },
  { key: 'fat',     label: 'Fat',     color: '#f59e0b', cal: 9 },
]

export default function MacroBar({ protein = 0, carbs = 0, fat = 0 }) {
  const totalCal = protein * 4 + carbs * 4 + fat * 9 || 1
  const values = { protein, carbs, fat }

  const pcts = MACROS.map(({ key, cal }) => ({
    key,
    pct: ((values[key] * cal) / totalCal) * 100,
  }))

  return (
    <div className="space-y-1">
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {MACROS.map(({ key, color }, i) => (
          <div
            key={key}
            className="transition-all duration-700 ease-out"
            style={{
              width: `${pcts[i].pct}%`,
              backgroundColor: color,
              borderRadius:
                i === 0 ? '9999px 0 0 9999px'
                : i === MACROS.length - 1 ? '0 9999px 9999px 0'
                : '0',
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-between text-xs text-gray-500 pt-1">
        {MACROS.map(({ key, label, color }) => (
          <span key={key} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
            <span className="font-medium text-gray-700">{Math.round(values[key])}g</span>
            {' '}{label}
          </span>
        ))}
      </div>
    </div>
  )
}
