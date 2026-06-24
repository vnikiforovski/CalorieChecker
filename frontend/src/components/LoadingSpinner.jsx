export default function LoadingSpinner({ fullScreen = false, size = 'md' }) {
  const dim = size === 'sm' ? 'w-5 h-5 border-2' : 'w-8 h-8 border-4'
  const spinner = (
    <div className={`${dim} border-blue-200 border-t-blue-500 rounded-full animate-spin`} />
  )
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {spinner}
      </div>
    )
  }
  return <div className="flex items-center justify-center py-8">{spinner}</div>
}
