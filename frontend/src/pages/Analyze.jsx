import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import api from '../api/axios'
import LoadingSpinner from '../components/LoadingSpinner'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

function ConfidencePill({ value }) {
  const pct = Math.round(value * 100)
  const cls =
    pct >= 80 ? 'bg-green-100 text-green-700'
    : pct >= 50 ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700'
  return <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cls}`}>{pct}% sure</span>
}

function MealTypeSelector({ value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
      <div className="flex gap-2">
        {MEAL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
              value === t ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Analyze() {
  const [tab, setTab] = useState('text')
  const [mealType, setMealType] = useState('lunch')
  const [inputText, setInputText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [items, setItems] = useState([])
  const [saved, setSaved] = useState(false)
  const [favoriteOpen, setFavoriteOpen] = useState(false)
  const [favoriteName, setFavoriteName] = useState('')
  const [favoriteSaving, setFavoriteSaving] = useState(false)
  const [favoriteSuccess, setFavoriteSuccess] = useState(false)

  const onDrop = useCallback((files) => {
    const f = files[0]
    if (!f) return
    setImageFile(f)
    setImagePreview(URL.createObjectURL(f))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  })

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleAnalyze = async () => {
    if (tab === 'text' && !inputText.trim()) { setError('Please describe your meal.'); return }
    if (tab === 'image' && !imageFile)       { setError('Please upload an image.');     return }

    setLoading(true)
    setError('')
    setResult(null)
    setSaved(false)
    setFavoriteSuccess(false)

    try {
      let data
      if (tab === 'text') {
        const { data: d } = await api.post('/meals/analyze/', { input_text: inputText.trim(), meal_type: mealType })
        data = d
      } else {
        const fd = new FormData()
        fd.append('image', imageFile)
        fd.append('meal_type', mealType)
        const { data: d } = await api.post('/meals/analyze/', fd)
        data = d
      }
      setResult(data)
      // Track editable quantity separate from original (for proportional scaling)
      setItems(data.food_items.map((i) => ({ ...i, editQty: i.quantity })))
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getIncrement = (qty) => (qty > 100 ? 25 : qty > 20 ? 10 : qty > 5 ? 5 : 1)

  const changeQty = (id, delta) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const inc = getIncrement(item.editQty)
        const newQty = Math.max(0, parseFloat((item.editQty + delta * inc).toFixed(2)))
        return { ...item, editQty: newQty }
      }),
    )
  }

  const handleSaveMeal = async () => {
    if (!result?.id) return
    const corrections = items
      .filter((i) => i.editQty !== i.quantity)
      .map((i) => ({ food_item_id: i.id, quantity: i.editQty }))

    if (corrections.length) {
      try {
        await api.put(`/meals/${result.id}/correct/`, { corrections })
      } catch { /* best-effort */ }
    }
    setSaved(true)
  }

  const handleReanalyze = async () => {
    if (result?.id) {
      try { await api.delete(`/meals/${result.id}/`) } catch { /* best-effort */ }
    }
    setResult(null)
    setItems([])
    setSaved(false)
    setFavoriteSuccess(false)
  }

  const handleSaveFavorite = async () => {
    if (!favoriteName.trim() || !result?.id) return
    setFavoriteSaving(true)
    try {
      await api.post(`/meals/${result.id}/favorite/`, { favorite_name: favoriteName.trim() })
      setFavoriteSuccess(true)
      setFavoriteOpen(false)
      setFavoriteName('')
    } catch { /* show nothing */ } finally {
      setFavoriteSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Analyze Meal</h1>

      {/* ── Input form ── */}
      {!result && (
        <div className="card overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {[
              { id: 'text',  label: '📝 Text Input' },
              { id: 'image', label: '📷 Photo' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { setTab(id); setError('') }}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  tab === id
                    ? 'text-blue-600 border-b-2 border-blue-500 -mb-px'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-5">
            <MealTypeSelector value={mealType} onChange={setMealType} />

            {tab === 'text' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Describe your meal</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={4}
                  placeholder="e.g. 2 scrambled eggs with whole wheat toast and orange juice"
                  className="input resize-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload meal photo</label>
                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden">
                    <img src={imagePreview} alt="preview" className="w-full max-h-64 object-cover" />
                    <button
                      onClick={clearImage}
                      className="absolute top-2 right-2 bg-white/90 backdrop-blur text-gray-700
                                 rounded-full w-8 h-8 flex items-center justify-center shadow hover:bg-red-50
                                 hover:text-red-500 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                      isDragActive
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="text-4xl mb-3">📷</div>
                    <p className="text-gray-600 font-medium">
                      {isDragActive ? 'Drop it here!' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">JPG, PNG, WebP</p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  Analyzing with AI…
                </span>
              ) : '🔍 Analyze with AI'}
            </button>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="space-y-4">
          {/* Totals */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
              {result.uncertainty_note && (
                <span className="text-xs bg-yellow-50 border border-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg max-w-xs">
                  ⚠️ {result.uncertainty_note}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Calories', val: Math.round(result.total_calories),       suffix: '',  bg: 'bg-blue-50',   text: 'text-blue-600' },
                { label: 'Protein',  val: Math.round(result.total_protein),        suffix: 'g', bg: 'bg-purple-50', text: 'text-purple-600' },
                { label: 'Carbs',    val: Math.round(result.total_carbs),          suffix: 'g', bg: 'bg-green-50',  text: 'text-green-600' },
                { label: 'Fat',      val: Math.round(result.total_fat),            suffix: 'g', bg: 'bg-amber-50',  text: 'text-amber-600' },
              ].map(({ label, val, suffix, bg, text }) => (
                <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                  <div className={`text-xl font-bold ${text}`}>{val}{suffix}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Food items */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Detected Items</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                      <ConfidencePill value={item.ai_confidence} />
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {Math.round(item.calories * (item.editQty / (item.quantity || 1)))} kcal
                      &nbsp;·&nbsp;P{Math.round(item.protein * (item.editQty / (item.quantity || 1)))}
                      &nbsp;C{Math.round(item.carbs   * (item.editQty / (item.quantity || 1)))}
                      &nbsp;F{Math.round(item.fat     * (item.editQty / (item.quantity || 1)))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => changeQty(item.id, -1)}
                      className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 text-sm font-bold transition-colors"
                    >
                      −
                    </button>
                    <span className="text-sm font-medium w-20 text-center">
                      {item.editQty}{item.unit}
                    </span>
                    <button
                      onClick={() => changeQty(item.id, 1)}
                      className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Healthy alternatives */}
          {result.healthy_alternatives?.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
              <h3 className="font-semibold text-emerald-800 mb-2">💚 Healthier Alternatives</h3>
              <ul className="space-y-1">
                {result.healthy_alternatives.map((alt, i) => (
                  <li key={i} className="text-sm text-emerald-700">• {alt}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={handleReanalyze} className="btn-ghost flex-1 py-3 text-sm font-semibold">
              Re-analyze
            </button>
            {saved ? (
              <div className="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold text-center text-sm">
                ✓ Meal Saved!
              </div>
            ) : (
              <button onClick={handleSaveMeal} className="btn-primary flex-1 py-3 text-sm">
                Save Meal
              </button>
            )}
          </div>

          {saved && !favoriteSuccess && (
            <button
              onClick={() => setFavoriteOpen(true)}
              className="w-full py-3 border border-yellow-200 bg-yellow-50 text-yellow-700 rounded-xl text-sm font-semibold hover:bg-yellow-100 transition-colors"
            >
              ⭐ Save as Favorite
            </button>
          )}

          {favoriteSuccess && (
            <div className="text-center text-sm text-yellow-600 font-medium py-2">
              ⭐ Saved to Favorites!
            </div>
          )}
        </div>
      )}

      {/* Favorite modal */}
      {favoriteOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-semibold text-gray-900 mb-1">Save as Favorite</h3>
            <p className="text-gray-400 text-sm mb-4">Give this meal a memorable name</p>
            <input
              value={favoriteName}
              onChange={(e) => setFavoriteName(e.target.value)}
              placeholder="e.g. Morning Oatmeal"
              className="input mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveFavorite()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setFavoriteOpen(false)}
                className="btn-ghost flex-1 py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFavorite}
                disabled={favoriteSaving || !favoriteName.trim()}
                className="btn-primary flex-1 py-2.5 text-sm"
              >
                {favoriteSaving ? '…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
