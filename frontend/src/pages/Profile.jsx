import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const GOALS = [
  { value: 'lose',     label: 'Lose Weight', icon: '📉', desc: '−500 kcal/day' },
  { value: 'maintain', label: 'Maintain',    icon: '⚖️', desc: 'TDEE only'     },
  { value: 'gain',     label: 'Gain Weight', icon: '📈', desc: '+500 kcal/day' },
]

export default function Profile() {
  const { user, updateUser } = useAuth()

  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    email:      user?.email      || '',
    profile: {
      age:              user?.profile?.age              ?? '',
      height_cm:        user?.profile?.height_cm        ?? '',
      weight_kg:        user?.profile?.weight_kg        ?? '',
      goal:             user?.profile?.goal             ?? 'maintain',
      daily_water_goal: user?.profile?.daily_water_goal ?? 2.0,
    },
  })

  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  const set  = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const setP = (k, v) => setForm((p) => ({ ...p, profile: { ...p.profile, [k]: v } }))

  const bmi =
    form.profile.weight_kg && form.profile.height_cm
      ? (form.profile.weight_kg / (form.profile.height_cm / 100) ** 2).toFixed(1)
      : null

  const bmiLabel = (b) => {
    if (!b) return ''
    if (b < 18.5) return 'Underweight'
    if (b < 25)   return 'Healthy'
    if (b < 30)   return 'Overweight'
    return 'Obese'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const payload = {
        ...form,
        profile: {
          ...form.profile,
          age:              form.profile.age              ? parseFloat(form.profile.age)              : null,
          height_cm:        form.profile.height_cm        ? parseFloat(form.profile.height_cm)        : null,
          weight_kg:        form.profile.weight_kg        ? parseFloat(form.profile.weight_kg)        : null,
          daily_water_goal: parseFloat(form.profile.daily_water_goal) || 2.0,
        },
      }
      const { data } = await api.put('/auth/profile/', payload)
      updateUser(data)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch {
      setError('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Stats overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {user?.profile?.daily_calorie_goal ? Math.round(user.profile.daily_calorie_goal) : '—'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Daily Calorie Goal</div>
        </div>
        <div className="card p-4 text-center">
          <div className={`text-2xl font-bold ${
            bmi ? (bmi < 18.5 ? 'text-blue-500' : bmi < 25 ? 'text-green-500' : bmi < 30 ? 'text-yellow-500' : 'text-red-500') : 'text-gray-300'
          }`}>
            {bmi || '—'}
          </div>
          <div className="text-xs text-gray-400 mt-1">BMI{bmi ? ` · ${bmiLabel(bmi)}` : ''}</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-orange-500">
            {user?.profile?.streak_days ?? 0}
          </div>
          <div className="text-xs text-gray-400 mt-1">Day Streak 🔥</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {form.profile.daily_water_goal}L
          </div>
          <div className="text-xs text-gray-400 mt-1">Water Goal 💧</div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Personal info */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
              <input className="input" value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)} placeholder="John" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
              <input className="input" value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)} placeholder="Doe" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input className="input" type="email" value={form.email}
                onChange={(e) => set('email', e.target.value)} placeholder="john@example.com" />
            </div>
          </div>
        </div>

        {/* Health metrics */}
        <div className="border-t border-gray-100 pt-6">
          <h2 className="font-semibold text-gray-900 mb-1">Health Metrics</h2>
          <p className="text-xs text-gray-400 mb-4">Used to calculate your personalized calorie goal via BMR formula</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Age</label>
              <input className="input" type="number" min="10" max="120" placeholder="25"
                value={form.profile.age} onChange={(e) => setP('age', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Height (cm)</label>
              <input className="input" type="number" min="100" max="250" placeholder="170"
                value={form.profile.height_cm} onChange={(e) => setP('height_cm', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Weight (kg)</label>
              <input className="input" type="number" min="30" max="300" placeholder="70"
                value={form.profile.weight_kg} onChange={(e) => setP('weight_kg', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Water Goal (L)</label>
              <input className="input" type="number" step="0.25" min="0.5" max="10" placeholder="2.0"
                value={form.profile.daily_water_goal} onChange={(e) => setP('daily_water_goal', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Goal */}
        <div className="border-t border-gray-100 pt-6">
          <h2 className="font-semibold text-gray-900 mb-4">Your Goal</h2>
          <div className="flex gap-3">
            {GOALS.map(({ value, label, icon, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setP('goal', value)}
                className={`flex-1 py-3 px-2 rounded-xl text-sm font-medium transition-all border ${
                  form.profile.goal === value
                    ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="text-2xl mb-1">{icon}</div>
                <div className="font-semibold text-xs">{label}</div>
                <div className={`text-[11px] mt-0.5 ${form.profile.goal === value ? 'text-blue-100' : 'text-gray-400'}`}>
                  {desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {error   && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm">✓ Profile updated! Your calorie goal has been recalculated.</div>}

        <button type="submit" disabled={saving} className="btn-primary w-full py-3">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
