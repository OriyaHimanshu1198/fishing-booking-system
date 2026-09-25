import { useState } from 'react'
import { Lock, User } from 'lucide-react'

function LoginForm({ onLogin, onCancel }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (username === 'admin' && password === 'admin') {
      onLogin()
    } else {
      setError('Invalid username or password')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card animate-slide-up">
        {onCancel && (
          <button
            onClick={onCancel}
            className="neu-btn neu-btn-ghost mb-4 text-xs flex items-center gap-1.5"
            style={{ marginBottom: '16px', padding: '6px 12px' }}
          >
            ← Return to Angler Site
          </button>
        )}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="login-icon">
            <Lock size={32} />
          </div>
          <h1 className="login-title">Admin Login</h1>
          <p className="login-subtitle">Fishing Booking System</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="neu-alert neu-alert-error animate-fade-in">
              {error}
            </div>
          )}

          <div className="neu-form-group">
            <label className="neu-form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User
                size={18}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-light)',
                  zIndex: 1,
                }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="neu-form-input"
                style={{ paddingLeft: '48px' }}
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div className="neu-form-group">
            <label className="neu-form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-light)',
                  zIndex: 1,
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="neu-form-input"
                style={{ paddingLeft: '48px' }}
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="neu-btn neu-btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: '1rem', marginTop: '8px' }}
          >
            Login
          </button>
        </form>

        <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-light)' }}>
          Default credentials: admin / admin
        </div>
      </div>
    </div>
  )
}

export default LoginForm
