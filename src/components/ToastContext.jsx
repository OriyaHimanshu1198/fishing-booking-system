import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { ...toast, id }])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback((message, title = 'Success') => {
    return addToast({ type: 'success', message, title })
  }, [addToast])

  const error = useCallback((message, title = 'Error') => {
    return addToast({ type: 'error', message, title })
  }, [addToast])

  const info = useCallback((message, title = 'Info') => {
    return addToast({ type: 'info', message, title })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info }}>
      {children}
    </ToastContext.Provider>
  )
}
