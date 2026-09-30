import { useState } from 'react'
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowLeft, KeyRound, Sparkles } from 'lucide-react'

function LoginForm({ onLogin, onCancel }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    setTimeout(() => {
      const cleanUser = username.trim()
      const cleanPass = password.trim()

      if ((cleanUser === 'admin' && cleanPass === 'admin') || (cleanUser === 'manager' && cleanPass === 'fishing2026')) {
        if (rememberMe) {
          localStorage.setItem('fishing_admin_auth', 'true')
        } else {
          sessionStorage.setItem('fishing_admin_auth', 'true')
        }
        onLogin()
      } else {
        setError('Invalid username or password. Please check your credentials.')
      }
      setSubmitting(false)
    }, 250)
  }

  const fillDemoCredentials = () => {
    setUsername('admin')
    setPassword('admin')
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md relative">
      {/* Background ambient decorative shapes */}
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative z-10 animate-slide-up">
        {/* Return Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            type="button"
            className="neu-btn neu-btn-ghost mb-6 text-xs flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft size={14} />
            <span>Return to Angler Site</span>
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Fishery Admin Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sign in to manage beats, view schedules, and edit reservations.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 animate-fade-in">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <User
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                placeholder="Enter admin username"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me & Quick fill */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700"
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              onClick={fillDemoCredentials}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
            >
              <KeyRound size={12} />
              <span>Fill Demo (admin/admin)</span>
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Lock size={16} />
                <span>Log In to Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Info */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <Sparkles size={12} className="text-emerald-500" />
          <span>Default Credentials: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">admin</code> / <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">admin</code></span>
        </div>
      </div>
    </div>
  )
}

export default LoginForm
