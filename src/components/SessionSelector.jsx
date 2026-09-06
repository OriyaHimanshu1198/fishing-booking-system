import { useState } from 'react'
import { Calendar, Plus, Check, Clock, Archive } from 'lucide-react'

function SessionSelector({ sessions, activeSession, onSelectSession, onCreateSession }) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newSession, setNewSession] = useState({
    year: new Date().getFullYear() + 1,
    name: '',
    start_date: '',
    end_date: ''
  })

  const handleCreateSession = () => {
    if (!newSession.start_date || !newSession.end_date) {
      setCreateError('Please fill in start and end dates')
      return
    }

    const start = new Date(newSession.start_date)
    const end = new Date(newSession.end_date)

    if (end <= start) {
      setCreateError('End date must be after start date')
      return
    }

    const sessionData = {
      ...newSession,
      name: newSession.name || `${newSession.year} Season`,
      status: 'upcoming'
    }

    setCreating(true)
    onCreateSession(sessionData)
    setShowCreateModal(false)
    setCreateError('')
    setNewSession({
      year: new Date().getFullYear() + 1,
      name: '',
      start_date: '',
      end_date: ''
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <Check size={14} />
      case 'upcoming':
        return <Clock size={14} />
      case 'completed':
        return <Archive size={14} />
      default:
        return null
    }
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'active':
        return { background: 'rgba(72, 187, 120, 0.15)', color: 'var(--accent-green)' }
      case 'upcoming':
        return { background: 'rgba(66, 153, 225, 0.15)', color: 'var(--accent-blue)' }
      case 'completed':
        return { background: 'var(--bg-inset)', color: 'var(--text-muted)' }
      default:
        return { background: 'var(--bg-inset)', color: 'var(--text-muted)' }
    }
  }

  return (
    <div className="neu-section animate-fade-in" style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 className="neu-section-title">
          <Calendar size={18} />
          Season Management
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="neu-btn neu-btn-success"
        >
          <Plus size={16} />
          New Season
        </button>
      </div>

      {/* Sessions Grid */}
      <div className="season-grid">
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session)}
            className={`season-card ${
              session.id === activeSession?.id
                ? 'active'
                : session.status === 'upcoming'
                ? 'upcoming'
                : ''
            }`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h4 style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '1.05rem' }}>
                  {session.name}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {new Date(session.start_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                  {' — '}
                  {new Date(session.end_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </p>
              </div>
              <span
                className="season-badge"
                style={{
                  ...getStatusStyle(session.status),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {getStatusIcon(session.status)}
                {session.status}
              </span>
            </div>

            {session.status === 'upcoming' && (
              <div style={{
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(72, 187, 120, 0.1)',
                marginTop: '8px',
              }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600 }}>
                  ✨ Open for advance booking
                </p>
              </div>
            )}

            {session.id === activeSession?.id && (
              <div style={{
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(66, 153, 225, 0.1)',
                marginTop: '8px',
              }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                  ✓ Currently viewing this season
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Add New Season Card */}
        {sessions.length < 3 && (
          <div
            onClick={() => setShowCreateModal(true)}
            className="add-season-card"
          >
            <Plus size={28} style={{ color: 'var(--text-light)', marginBottom: '8px' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Add New Season</p>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="neu-modal">
          <div className="neu-modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '24px' }}>
              Create New Season
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="neu-form-group" style={{ marginBottom: 0 }}>
                <label className="neu-form-label">Year</label>
                <input
                  type="number"
                  value={newSession.year}
                  onChange={(e) => setNewSession({ ...newSession, year: parseInt(e.target.value) })}
                  className="neu-form-input"
                  min={new Date().getFullYear()}
                  max={new Date().getFullYear() + 5}
                />
              </div>

              <div className="neu-form-group" style={{ marginBottom: 0 }}>
                <label className="neu-form-label">Season Name (optional)</label>
                <input
                  type="text"
                  value={newSession.name}
                  onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  placeholder={`${newSession.year} Season`}
                  className="neu-form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="neu-form-group" style={{ marginBottom: 0 }}>
                  <label className="neu-form-label">Start Date</label>
                  <input
                    type="date"
                    value={newSession.start_date}
                    onChange={(e) => setNewSession({ ...newSession, start_date: e.target.value })}
                    className="neu-form-input"
                  />
                </div>
                <div className="neu-form-group" style={{ marginBottom: 0 }}>
                  <label className="neu-form-label">End Date</label>
                  <input
                    type="date"
                    value={newSession.end_date}
                    onChange={(e) => setNewSession({ ...newSession, end_date: e.target.value })}
                    className="neu-form-input"
                  />
                </div>
              </div>

              <div className="neu-alert neu-alert-info">
                💡 Tip: You can create seasons in advance. Guests can book for upcoming seasons once they're created.
              </div>
              {createError && (
                <div className="neu-alert neu-alert-error" style={{ marginTop: '12px' }}>
                  ❌ {createError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '14px', marginTop: '28px' }}>
              <button
                onClick={handleCreateSession}
                className={`neu-btn neu-btn-primary ${creating ? 'loading' : ''}`}
                style={{ flex: 1, padding: '14px' }}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Season'}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="neu-btn neu-btn-ghost"
                style={{ flex: 1, padding: '14px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionSelector
