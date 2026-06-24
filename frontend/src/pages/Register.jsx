import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const GOALS = [
  { value: 'lose',     label: 'Lose Weight', icon: '📉' },
  { value: 'maintain', label: 'Maintain',    icon: '⚖️' },
  { value: 'gain',     label: 'Gain Weight', icon: '📈' },
]

const INITIAL = {
  username: '', email: '', password: '', first_name: '', last_name: '',
  profile: { age: '', height_cm: '', weight_kg: '', goal: 'maintain' },
}

export default function Register() {
  const [form, setForm] = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const setP = (k, v) => setForm((p) => ({ ...p, profile: { ...p.profile, [k]: v } }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        profile: {
          ...form.profile,
          age:       form.profile.age       ? parseFloat(form.profile.age)       : null,
          height_cm: form.profile.height_cm ? parseFloat(form.profile.height_cm) : null,
          weight_kg: form.profile.weight_kg ? parseFloat(form.profile.weight_kg) : null,
        },
      }
      await register(payload)
      navigate('/')
    } catch (err) {
      const d = err.response?.data
      if (d) {
        const msgs = Object.entries(d)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
          .join(' | ')
        setError(msgs)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥗</div>
          <h1 className="text-2xl font-bold text-gray-900">CalorieChecker</h1>
          <p className="text-gray-400 text-sm mt-1">Start your nutrition journey</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create account</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                <input className="input" placeholder="John" value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                <input className="input" placeholder="Doe" value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <input className="input" placeholder="johndoe" value={form.username} required
                onChange={(e) => set('username', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input className="input" type="email" placeholder="john@example.com" value={form.email}
                onChange={(e) => set('email', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input className="input" type="password" placeholder="Min 8 characters" value={form.password}
                required minLength={8} onChange={(e) => set('password', e.target.value)} />
            </div>

            {/* Health info */}
            <div className="border-t border-gray-100 pt-5">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Health Info <span className="text-gray-400 font-normal">(optional — used to calculate your calorie goal)</span>
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Age</label>
                  <input className="input-sm" type="number" placeholder="25" value={form.profile.age}
                    onChange={(e) => setP('age', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Height (cm)</label>
                  <input className="input-sm" type="number" placeholder="170" value={form.profile.height_cm}
                    onChange={(e) => setP('height_cm', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Weight (kg)</label>
                  <input className="input-sm" type="number" placeholder="70" value={form.profile.weight_kg}
                    onChange={(e) => setP('weight_kg', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Goal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Goal</label>
              <div className="flex gap-2">
                {GOALS.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setP('goal', value)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors border ${
                      form.profile.goal === value
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-lg mb-0.5">{icon}</div>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-500 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
