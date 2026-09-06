import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

const TOAST_STYLES = {
  success: { icon: CheckCircle, bg: 'rgba(72, 187, 120, 0.12)', border: 'rgba(72, 187, 120, 0.3)', color: '#276749' },
  error: { icon: AlertCircle, bg: 'rgba(245, 101, 101, 0.12)', border: 'rgba(245, 101, 101, 0.3)', color: '#9b2c2c' },
  info: { icon: Info, bg: 'rgba(66, 153, 225, 0.12)', border: 'rgba(66, 153, 225, 0.3)', color: '#2b6cb0' },
}

export default function Toast({ toasts, onRemove }) {
  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '400px',
      pointerEvents: 'none',
    }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false)
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info
  const Icon = style.icon

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration || 3500)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 18px',
        background: 'var(--card-bg)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '8px 8px 24px var(--shadow-dark-strong), -8px -8px 24px var(--shadow-light)',
        borderLeft: `4px solid ${style.border}`,
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(100px)' : 'translateX(0)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
      onClick={() => {
        setExiting(true)
        setTimeout(() => onRemove(toast.id), 300)
      }}
    >
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '12px',
        background: style.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} style={{ color: style.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '2px' }}>
            {toast.title}
          </div>
        )}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {toast.message}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setExiting(true)
          setTimeout(() => onRemove(toast.id), 300)
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-light)',
          padding: '4px',
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
