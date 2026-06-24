export default function CalorieRing({ consumed, goal }) {
  const R = 70
  const circumference = 2 * Math.PI * R
  const hasGoal = goal && goal > 0
  const progress = hasGoal ? Math.min(consumed / goal, 1) : 0
  const offset = circumference - progress * circumference
  const remaining = hasGoal ? Math.max(goal - consumed, 0) : null
  const overGoal = hasGoal && consumed > goal

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative w-44 h-44">
        <svg className="-rotate-90 w-full h-full" viewBox="0 0 180 180">
          {/* Track */}
          <circle
            cx="90" cy="90" r={R}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="14"
          />
          {/* Progress */}
          <circle
            cx="90" cy="90" r={R}
            fill="none"
            stroke={overGoal ? '#ef4444' : '#3b82f6'}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900 leading-none">
            {Math.round(consumed)}
          </span>
          <span className="text-xs text-gray-400 mt-0.5">kcal eaten</span>
          {hasGoal && (
            <span className="text-[11px] text-gray-400 mt-1">of {Math.round(goal)}</span>
          )}
        </div>
      </div>

      {hasGoal && (
        <p className={`text-sm font-medium mt-1 ${overGoal ? 'text-red-500' : 'text-gray-500'}`}>
          {overGoal
            ? `${Math.round(consumed - goal)} kcal over goal`
            : `${Math.round(remaining)} kcal remaining`}
        </p>
      )}
    </div>
  )
}
