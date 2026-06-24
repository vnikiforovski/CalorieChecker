import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import api from '../api/axios'
import LoadingSpinner from '../components/LoadingSpinner'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function StatCard({ label, value, suffix = '', color }) {
  return (
    <div className={`card p-5 text-center ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-70">{suffix}</div>
      <div className="text-xs mt-0.5 font-medium">{label}</div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      <p className="text-blue-600 font-bold">{d.calories} kcal</p>
      <p className="text-gray-400">P: {d.protein}g  C: {d.carbs}g  F: {d.fat}g</p>
      <p className="text-gray-400">💧 {d.water}L</p>
    </div>
  )
}

export default function Weekly() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/weekly/')
      .then(({ data: d }) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (!data)   return null

  const today = new Date()
  const chartData = data.days.map((day, i) => {
    const d = new Date(day.date + 'T12:00:00')
    const isToday = d.toDateString() === today.toDateString()
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calories: Math.round(day.calories),
      protein: Math.round(day.protein),
      carbs: Math.round(day.carbs),
      fat: Math.round(day.fat),
      water: day.water_intake.toFixed(1),
      isToday,
    }
  })

  const activeDays = data.days.filter((d) => d.calories > 0)
  const bestDay  = activeDays.length ? activeDays.reduce((a, b) => (a.calories > b.calories ? a : b)) : null
  const worstDay = activeDays.length ? activeDays.reduce((a, b) => (a.calories < b.calories ? a : b)) : null
  const avgCal   = Math.round(data.weekly_averages.calories)

  const fmtDate = (s) =>
    new Date(s + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Weekly Summary</h1>

      {/* Bar chart */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 mb-5">Calories — Last 7 Days</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="calories" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isToday ? '#3b82f6' : '#bfdbfe'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-center text-xs text-gray-400 mt-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-500 mr-1 align-middle" />Today
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-200 mr-1 align-middle ml-3" />Other days
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Avg. Daily"
          value={avgCal}
          suffix="kcal / day"
          color="text-blue-700"
        />
        <StatCard
          label="Best Day"
          value={bestDay ? fmtDate(bestDay.date) : '—'}
          suffix={bestDay ? `${Math.round(bestDay.calories)} kcal` : ''}
          color="text-green-700"
        />
        <StatCard
          label="Lowest Day"
          value={worstDay ? fmtDate(worstDay.date) : '—'}
          suffix={worstDay ? `${Math.round(worstDay.calories)} kcal` : ''}
          color="text-orange-700"
        />
      </div>

      {/* Daily breakdown table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-700">Daily Breakdown</h2>
        </div>
        <div>
          {chartData.slice().reverse().map((day, i) => (
            <div
              key={i}
              className={`px-6 py-4 flex items-center gap-4 border-b border-gray-50 last:border-0 ${
                day.isToday ? 'bg-blue-50/40' : ''
              }`}
            >
              <div className="w-24 shrink-0">
                <p className={`text-sm font-medium ${day.isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {day.day} {day.isToday && '(today)'}
                </p>
                <p className="text-xs text-gray-400">{day.date}</p>
              </div>

              <div className="flex-1">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${avgCal > 0 ? Math.min((day.calories / (avgCal * 1.5)) * 100, 100) : 0}%`,
                      backgroundColor: day.isToday ? '#3b82f6' : '#93c5fd',
                    }}
                  />
                </div>
              </div>

              <div className="text-right shrink-0 w-28">
                <span className="font-semibold text-gray-900">{day.calories}</span>
                <span className="text-gray-400 text-xs ml-1">kcal</span>
              </div>

              <div className="text-xs text-gray-400 hidden sm:block w-28 text-right">
                P{day.protein} · C{day.carbs} · F{day.fat}
              </div>

              <div className="text-xs text-blue-400 hidden md:block w-12 text-right">
                💧{day.water}L
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
