import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import CalorieRing from '../components/CalorieRing'
import MacroBar from '../components/MacroBar'
import LoadingSpinner from '../components/LoadingSpinner'

const MEAL_META = {
  breakfast: { icon: '🌅', label: 'Breakfast' },
  lunch:     { icon: '☀️',  label: 'Lunch' },
  dinner:    { icon: '🌙', label: 'Dinner' },
  snack:     { icon: '🍎', label: 'Snack' },
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [waterBusy, setWaterBusy] = useState(false)
  const [error, setError] = useState('')

  const fetchDashboard = useCallback(async () => {
    try {
      const { data: d } = await api.get('/dashboard/today/')
      setData(d)
    } catch {
      setError('Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const handleAddWater = async () => {
    if (waterBusy || !data) return
    setWaterBusy(true)
    try {
      const { data: log } = await api.put('/dashboard/water/', {
        water_intake: parseFloat((data.water_intake + 0.25).toFixed(2)),
      })
      setData((p) => ({ ...p, water_intake: log.water_intake }))
    } finally {
      setWaterBusy(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error)   return <p className="text-center py-16 text-red-500">{error}</p>
  if (!data)   return null

  const { meals, totals, water_intake, goals, progress, streak_days } = data
  const waterGoal = goals.water || 2
  const filledGlasses = Math.min(Math.round(water_intake * 4), Math.round(waterGoal * 4))
  const totalGlasses  = Math.round(waterGoal * 4)

  // Group meals by type, preserving canonical order
  const mealGroups = ['breakfast', 'lunch', 'dinner', 'snack'].reduce((acc, type) => {
    const list = meals.filter((m) => m.meal_type === type)
    if (list.length) acc[type] = list
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today</h1>
          <p className="text-gray-400 text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {streak_days > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 px-4 py-2 rounded-full">
            <span>🔥</span>
            <span className="font-semibold text-orange-600 text-sm">{streak_days}-day streak</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Calorie ring */}
        <div className="card p-6 flex flex-col items-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Calories</p>
          <CalorieRing consumed={totals.calories} goal={goals.calories} />
        </div>

        {/* Macros */}
        <div className="card p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Macronutrients</p>
          <MacroBar protein={totals.protein} carbs={totals.carbs} fat={totals.fat} />
          <div className="grid grid-cols-3 gap-2 mt-5 text-center">
            {[
              { label: 'Protein', val: totals.protein, color: 'text-blue-500' },
              { label: 'Carbs',   val: totals.carbs,   color: 'text-emerald-500' },
              { label: 'Fat',     val: totals.fat,     color: 'text-amber-500' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl py-2">
                <div className={`text-lg font-bold ${color}`}>{Math.round(val)}g</div>
                <div className="text-[11px] text-gray-400">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Water */}
        <div className="card p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Water Intake</p>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-3xl font-bold text-blue-500">{water_intake.toFixed(2)}</span>
              <span className="text-gray-400 text-sm ml-1">/ {waterGoal} L</span>
            </div>
            <button
              onClick={handleAddWater}
              disabled={waterBusy}
              className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold
                         flex items-center justify-center transition-colors disabled:opacity-50 shadow-sm"
            >
              +
            </button>
          </div>

          {/* Glass icons */}
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: totalGlasses }).map((_, i) => (
              <span key={i} className={`text-xl transition-opacity ${i < filledGlasses ? 'opacity-100' : 'opacity-15'}`}>
                💧
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-300 mt-2">+250 ml per tap</p>

          {progress.water_percent !== null && (
            <div className="mt-3">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress.water_percent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">{Math.round(progress.water_percent)}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Meals */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Today's Meals</h2>
          <Link
            to="/analyze"
            className="btn-primary px-4 py-2 text-sm"
          >
            + Add Meal
          </Link>
        </div>

        {Object.keys(mealGroups).length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">🍽️</div>
            <p className="text-gray-400">No meals logged today.</p>
            <Link to="/analyze" className="inline-block mt-3 text-sm text-blue-500 hover:underline">
              Analyze your first meal →
            </Link>
          </div>
        ) : (
          <div>
            {Object.entries(mealGroups).map(([type, list]) => {
              const { icon, label } = MEAL_META[type]
              const typeCalories = list.reduce((s, m) => s + m.total_calories, 0)
              return (
                <div key={type} className="border-b border-gray-50 last:border-0 px-6 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{icon}</span>
                    <span className="font-medium text-gray-700">{label}</span>
                    <span className="ml-auto text-sm text-gray-400">{Math.round(typeCalories)} kcal</span>
                  </div>
                  <div className="space-y-1.5 pl-7">
                    {list.map((meal) => (
                      <div key={meal.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 truncate max-w-xs">
                          {meal.food_items?.map((i) => i.name).join(', ') || meal.input_text || 'Meal'}
                        </span>
                        <span className="text-gray-700 font-medium ml-4 shrink-0">
                          {Math.round(meal.total_calories)} kcal
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
