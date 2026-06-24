import { useState, useEffect } from 'react'
import api from '../api/axios'
import LoadingSpinner from '../components/LoadingSpinner'

const MEAL_META = {
  breakfast: { icon: '🌅', label: 'Breakfast' },
  lunch:     { icon: '☀️',  label: 'Lunch' },
  dinner:    { icon: '🌙', label: 'Dinner' },
  snack:     { icon: '🍎', label: 'Snack' },
}

function FavoriteModal({ meal, onClose, onSave }) {
  const [name, setName] = useState(meal.favorite_name || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.post(`/meals/${meal.id}/favorite/`, { favorite_name: name.trim() })
      onSave()
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-semibold text-gray-900 mb-1">Save as Favorite</h3>
        <p className="text-gray-400 text-sm mb-4">Name this meal so you can quickly log it again</p>
        <input
          className="input mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My Lunch Bowl"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary flex-1 py-2.5 text-sm">
            {saving ? '…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const today    = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())     return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function History() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [favoriteTarget, setFavoriteTarget] = useState(null)

  const fetchMeals = async (date = '') => {
    setLoading(true)
    try {
      const params = date ? { date } : {}
      const { data } = await api.get('/meals/history/', { params })
      setMeals(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchMeals(dateFilter) }, [dateFilter])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this meal?')) return
    await api.delete(`/meals/${id}/`)
    setMeals((p) => p.filter((m) => m.id !== id))
  }

  // Group by date string
  const grouped = meals.reduce((acc, m) => {
    const d = m.created_at.split('T')[0]
    ;(acc[d] = acc[d] || []).push(m)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Meal History</h1>
        <div className="flex items-center gap-2">
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-gray-400 hover:text-red-500 px-2 py-1"
            >
              Clear
            </button>
          )}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : sortedDates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📋</div>
          <p>No meals found{dateFilter ? ' for this date' : ''}.</p>
        </div>
      ) : (
        sortedDates.map((date) => {
          const dayMeals = grouped[date]
          const dayTotal = dayMeals.reduce((s, m) => s + m.total_calories, 0)
          return (
            <div key={date} className="card overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-gray-700">{formatDate(date)}</span>
                <span className="text-sm text-gray-400">{Math.round(dayTotal)} kcal</span>
              </div>

              <div>
                {dayMeals.map((meal) => {
                  const meta = MEAL_META[meal.meal_type]
                  const isOpen = expanded === meal.id
                  return (
                    <div key={meal.id} className="border-b border-gray-50 last:border-0">
                      <div className="px-5 py-4 flex items-center gap-3">
                        <span className="text-xl shrink-0">{meta.icon}</span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-medium text-gray-800 text-sm">{meta.label}</span>
                            {meal.is_favorite && <span className="text-yellow-400 text-xs">⭐</span>}
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {meal.food_items?.slice(0, 4).map((i) => i.name).join(', ')}
                            {meal.food_items?.length > 4 && ` +${meal.food_items.length - 4} more`}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-semibold text-gray-900 text-sm">{Math.round(meal.total_calories)} kcal</div>
                          <div className="text-[11px] text-gray-400">
                            P{Math.round(meal.total_protein)} C{Math.round(meal.total_carbs)} F{Math.round(meal.total_fat)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setExpanded(isOpen ? null : meal.id)}
                            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-600 text-xs"
                            title="Expand"
                          >
                            {isOpen ? '▲' : '▼'}
                          </button>
                          <button
                            onClick={() => setFavoriteTarget(meal)}
                            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-yellow-500 text-sm"
                            title="Save as favorite"
                          >
                            ⭐
                          </button>
                          <button
                            onClick={() => handleDelete(meal.id)}
                            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 text-sm"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {isOpen && meal.food_items?.length > 0 && (
                        <div className="px-5 pb-4 pl-14 space-y-1.5">
                          {meal.food_items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">
                                {item.name}{' '}
                                <span className="text-gray-300 text-xs">({item.quantity} {item.unit})</span>
                              </span>
                              <span className="text-gray-600 font-medium">{Math.round(item.calories)} kcal</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {favoriteTarget && (
        <FavoriteModal
          meal={favoriteTarget}
          onClose={() => setFavoriteTarget(null)}
          onSave={() => { setFavoriteTarget(null); fetchMeals(dateFilter) }}
        />
      )}
    </div>
  )
}
