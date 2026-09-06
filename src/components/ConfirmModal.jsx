import { AlertTriangle, Trash2, Info } from 'lucide-react'

const CONFIRM_STYLES = {
  danger: {
    icon: Trash2,
    iconBg: 'rgba(245, 101, 101, 0.12)',
    iconColor: 'var(--accent-red)',
    btnClass: 'neu-btn-danger',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'rgba(237, 137, 54, 0.12)',
    iconColor: 'var(--accent-orange)',
    btnClass: 'neu-btn-primary',
  },
  info: {
    icon: Info,
    iconBg: 'rgba(66, 153, 225, 0.12)',
    iconColor: 'var(--accent-blue)',
    btnClass: 'neu-btn-primary',
  },
}

export default function ConfirmModal({ isOpen, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger', onConfirm, onCancel }) {
  if (!isOpen) return null

  const style = CONFIRM_STYLES[variant] || CONFIRM_STYLES.danger
  const Icon = style.icon

  return (
    <div className="neu-modal-overlay" onClick={onCancel}>
      <div
        className="neu-modal animate-slide-up"
        style={{ maxWidth: '420px', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: style.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Icon size={28} style={{ color: style.iconColor }} />
        </div>

        <h3 style={{
          fontSize: '1.2rem',
          fontWeight: 800,
          color: 'var(--text-dark)',
          marginBottom: '10px',
        }}>
          {title}
        </h3>

        <p style={{
          fontSize: '0.9rem',
          color: 'var(--text-muted)',
          marginBottom: '28px',
          lineHeight: 1.5,
        }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            className="neu-btn neu-btn-ghost"
            style={{ flex: 1, padding: '14px' }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`neu-btn ${style.btnClass}`}
            style={{ flex: 1, padding: '14px' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
