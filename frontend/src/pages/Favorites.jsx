import { useState, useEffect } from 'react'
import api from '../api/axios'
import LoadingSpinner from '../components/LoadingSpinner'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

function RelogModal({ meal, onClose, onSuccess }) {
  const [mealType, setMealType] = useState(meal.meal_type)
  const [loading, setLoading] = useState(false)

  const handleRelog = async () => {
    setLoading(true)
    try {
      await api.post(`/meals/${meal.id}/relog/`, { meal_type: mealType })
      onSuccess(meal.favorite_name)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-semibold text-gray-900 mb-0.5">Log Again</h3>
        <p className="text-gray-400 text-sm mb-4">
          Which meal slot for <strong className="text-gray-700">{meal.favorite_name}</strong>?
        </p>
        <div className="flex gap-2 mb-6">
          {MEAL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setMealType(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
                mealType === t ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-sm font-medium">Cancel</button>
          <button onClick={handleRelog} disabled={loading} className="btn-primary flex-1 py-2.5 text-sm">
            {loading ? '…' : 'Log It'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Favorites() {
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [relogTarget, setRelogTarget] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    api.get('/meals/favorites/')
      .then(({ data }) => setFavorites(data))
      .finally(() => setLoading(false))
  }, [])

  const handleSuccess = (name) => {
    setRelogTarget(null)
    setSuccessMsg(`"${name}" logged for today!`)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Favorite Meals</h1>

      {successMsg && (
        <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-green-400 hover:text-green-600 ml-4">✕</button>
        </div>
      )}

      {favorites.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-6xl mb-4">⭐</div>
          <p className="font-medium text-gray-500">No favorites yet</p>
          <p className="text-sm mt-1">
            Save a meal as favorite from the{' '}
            <a href="/history" className="text-blue-500 hover:underline">History page</a>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((meal) => (
            <div
              key={meal.id}
              className="card p-5 hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Top */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-base leading-tight pr-2">
                  {meal.favorite_name}
                </h3>
                <span className="text-yellow-400 text-xl shrink-0">⭐</span>
              </div>

              {/* Calories */}
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {Math.round(meal.total_calories)} <span className="text-sm font-normal text-gray-400">kcal</span>
              </div>

              {/* Macros */}
              <div className="flex gap-3 text-xs text-gray-500 mb-3">
                <span>P: <strong className="text-gray-700">{Math.round(meal.total_protein)}g</strong></span>
                <span>C: <strong className="text-gray-700">{Math.round(meal.total_carbs)}g</strong></span>
                <span>F: <strong className="text-gray-700">{Math.round(meal.total_fat)}g</strong></span>
              </div>

              {/* Items preview */}
              {meal.food_items?.length > 0 && (
                <p className="text-xs text-gray-400 mb-4 line-clamp-2 flex-1">
                  {meal.food_items.map((i) => i.name).join(', ')}
                </p>
              )}

              <button
                onClick={() => setRelogTarget(meal)}
                className="btn-primary w-full py-2 text-sm mt-auto"
              >
                Log Again
              </button>
            </div>
          ))}
        </div>
      )}

      {relogTarget && (
        <RelogModal
          meal={relogTarget}
          onClose={() => setRelogTarget(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
