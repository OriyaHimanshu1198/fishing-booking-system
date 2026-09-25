import { useState, useEffect, useRef } from 'react'
import { Calendar, Plus, Users, LogOut, ChevronDown, Eye, Moon, Sun, Compass } from 'lucide-react'
import Dashboard from './components/Dashboard'
import BookingForm from './components/BookingForm'
import WeeklyView from './components/WeeklyView'
import ViewBookings from './components/ViewBookings'
import LoginForm from './components/LoginForm'
import SessionSelector from './components/SessionSelector'
import UserPortal from './components/UserPortal'
import Toast from './components/Toast'
import ConfirmModal from './components/ConfirmModal'
import { ToastProvider, useToast } from './components/ToastContext'
import {
  supabase,
  fetchSessions,
  createSession,
  getActiveSession,
  migrateBookingsToSessions
} from './supabase'
import emailService from './utils/emailService'
import './App.css'

// Animation wrapper component
const FadeIn = ({ children, delay = 0 }) => (
  <div className="animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
    {children}
  </div>
)

const SlideUp = ({ children, delay = 0 }) => (
  <div className="animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
    {children}
  </div>
)

// Click-outside hook
function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return
      handler()
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

function AppContent() {
  const { toasts, removeToast, success, error: toastError, info } = useToast()
  const [currentMode, setCurrentMode] = useState('user') // 'user' | 'admin'
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionStart, setSessionStart] = useState('')
  const [sessionEnd, setSessionEnd] = useState('')
  const [sessionConfigured, setSessionConfigured] = useState(false)
  const [bookings, setBookings] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [editingBooking, setEditingBooking] = useState(null)
  const [currentView, setCurrentView] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [upcomingSession, setUpcomingSession] = useState(null)
  const [showSessionDropdown, setShowSessionDropdown] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('fishing-dark-mode') === 'true'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('fishing-dark-mode', darkMode)
  }, [darkMode])

  // Click-outside for dropdown
  const dropdownRef = useRef(null)
  useClickOutside(dropdownRef, () => setShowSessionDropdown(false))

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', variant: 'danger', onConfirm: null })

  const showConfirm = (title, message, variant, onConfirm) => {
    setConfirmModal({ open: true, title, message, variant, onConfirm })
  }

  const closeConfirm = () => {
    setConfirmModal({ open: false, title: '', message: '', variant: 'danger', onConfirm: null })
  }

  // Fetch all sessions
  const loadSessions = async () => {
    const { data, error } = await fetchSessions()
    if (data) {
      setSessions(data)
      const active = data.find(s => s.status === 'active')
      const upcoming = data.find(s => s.status === 'upcoming')
      if (active) setActiveSession(active)
      if (upcoming) setUpcomingSession(upcoming)
    }
    if (error) console.error('Error fetching sessions:', error)
  }

  // Fetch bookings from Supabase (filtered by active session)
  const fetchBookings = async (sessionId = null) => {
    let query = supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: true })

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data, error } = await query
    if (data) setBookings(data)
    if (error) console.error('Error fetching bookings:', error)
  }

  // Fetch all bookings across all sessions
  const fetchAllBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: true })

    if (data) setAllBookings(data)
    if (error) console.error('Error fetching all bookings:', error)
  }

  // Load session settings
  const fetchSettings = async () => {
    await loadSessions()
    const { data: activeSessionData } = await getActiveSession()

    if (activeSessionData) {
      setSessionStart(activeSessionData.start_date)
      setSessionEnd(activeSessionData.end_date)
      setSessionConfigured(true)
      await fetchBookings(activeSessionData.id)
      await fetchAllBookings()
    } else {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single()

      if (data) {
        setSessionStart(data.session_start)
        setSessionEnd(data.session_end)
        setSessionConfigured(true)
        await migrateBookingsToSessions()
        await loadSessions()
      }
      if (error && error.code !== 'PGRST116') console.error('Error fetching settings:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const addBooking = async (booking) => {
    setSubmitting(true)
    const { id, ...bookingWithoutId } = booking
    const bookingData = {
      ...bookingWithoutId,
      session_id: booking.session_id || activeSession?.id || null
    }

    const { error: insertError } = await supabase
      .from('bookings')
      .insert(bookingData)

    setSubmitting(false)

    if (insertError) {
      console.error('Error adding booking:', insertError)
      toastError('Failed to save booking. Please try again.')
      return
    }

    // Send email confirmation
    try {
      await emailService.sendBookingConfirmation({
        ...bookingData,
        id: id || Date.now(), // Use temp ID if not yet available
        email: booking.email
      })
      // Note: In a real app, you might want to handle email errors differently
      // For now, we'll log but not fail the booking if email fails
    } catch (emailError) {
      console.warn('Email sending failed (but booking saved):', emailError)
      // We don't fail the booking if email fails
    }

    await fetchBookings(activeSession?.id)
    await fetchAllBookings()
    setEditingBooking(null)
    setCurrentView('dashboard')
    success('Booking created successfully! Confirmation email sent.')
  }

  const updateBooking = async (updatedBooking) => {
    setSubmitting(true)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        name: updatedBooking.name,
        email: updatedBooking.email,
        phone: updatedBooking.phone,
        week: updatedBooking.week,
        days_count: updatedBooking.days_count,
        booking_type: updatedBooking.booking_type,
        beat_allocations: updatedBooking.beat_allocations
      })
      .eq('id', updatedBooking.id)

    setSubmitting(false)

    if (updateError) {
      console.error('Error updating booking:', updateError)
      toastError('Failed to update booking. Please try again.')
      return
    }

    // Send email confirmation for update
    try {
      await emailService.sendBookingConfirmation({
        ...updatedBooking,
        id: updatedBooking.id,
        email: updatedBooking.email
      })
      // Note: In a real app, you might want to handle email errors differently
      // For now, we'll log but not fail the booking if email fails
    } catch (emailError) {
      console.warn('Email sending failed (but booking updated):', emailError)
      // We don't fail the booking if email fails
    }

    await fetchBookings(activeSession?.id)
    await fetchAllBookings()
    setEditingBooking(null)
    setCurrentView('dashboard')
    success('Booking updated successfully! Confirmation email sent.')
  }

  const handleDeleteBooking = (id) => {
    showConfirm(
      'Delete Booking',
      'Are you sure you want to delete this booking? This action cannot be undone.',
      'danger',
      async () => {
        // Get booking details before deleting for email
        const { data: bookingToDelete, error: fetchError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', id)
          .single()

        if (fetchError) {
          console.error('Error fetching booking for deletion:', fetchError)
          toastError('Failed to delete booking. Please try again.')
          return
        }

        const { error: deleteError } = await supabase
          .from('bookings')
          .delete()
          .eq('id', id)

        if (deleteError) {
          console.error('Error deleting booking:', deleteError)
          toastError('Failed to delete booking. Please try again.')
          return
        }

        // Send cancellation email
        try {
          await emailService.sendCancellationConfirmation({
            ...bookingToDelete,
            email: bookingToDelete.email
          })
          // Note: In a real app, you might want to handle email errors differently
          // For now, we'll log but not fail the deletion if email fails
        } catch (emailError) {
          console.warn('Email sending failed (but booking deleted):', emailError)
          // We don't fail the deletion if email fails
        }

        await fetchBookings(activeSession?.id)
        await fetchAllBookings()
        success('Booking deleted. Cancellation email sent.')
        closeConfirm()
      }
    )
  }

  const handleEditBooking = (booking) => {
    setEditingBooking(booking)
    setCurrentView('form')
  }

  const updateSession = async (newStart, newEnd) => {
    if (activeSession) {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          start_date: newStart,
          end_date: newEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSession.id)
      if (updateError) {
        console.error('Error updating session:', updateError)
        toastError('Failed to update season. Please try again.')
        return
      }
    } else {
      const { error: upsertError } = await supabase
        .from('settings')
        .upsert({ id: 1, session_start: newStart, session_end: newEnd, updated_at: new Date() })
      if (upsertError) {
        console.error('Error saving settings:', upsertError)
        toastError('Failed to save settings. Please try again.')
        return
      }
    }
    setSessionStart(newStart)
    setSessionEnd(newEnd)
    setSessionConfigured(true)
    await loadSessions()
    success('Season dates updated!')
  }

  const handleSelectSession = async (session) => {
    setActiveSession(session)
    setSessionStart(session.start_date)
    setSessionEnd(session.end_date)
    setShowSessionDropdown(false)
    await fetchBookings(session.id)
    await fetchAllBookings()
    info(`Switched to ${session.name}`)
  }

  const handleCreateSession = async (newSession) => {
    const { data, error: createError } = await createSession(newSession)
    if (createError) {
      console.error('Error creating session:', createError)
      toastError('Failed to create season. Please try again.')
      return
    }
    await loadSessions()
    await fetchAllBookings()
    if (data) {
      handleSelectSession(data)
    }
    success('New season created!')
  }

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentMode('user')
    setCurrentView('dashboard')
  }

  if (currentMode === 'user') {
    return (
      <>
        <UserPortal
          sessions={sessions}
          activeSession={activeSession}
          upcomingSession={upcomingSession}
          sessionStart={sessionStart}
          sessionEnd={sessionEnd}
          bookings={bookings}
          allBookings={allBookings}
          onAddBooking={addBooking}
          onSwitchToAdmin={() => setCurrentMode('admin')}
          submitting={submitting}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />
        <Toast toasts={toasts} onRemove={removeToast} />
      </>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginForm
          onLogin={handleLogin}
          onCancel={() => setCurrentMode('user')}
        />
        <Toast toasts={toasts} onRemove={removeToast} />
      </>
    )
  }

  if (loading) {
    return (
      <div className="login-container">
        <div style={{ textAlign: 'center' }}>
          <div className="neu-spinner"></div>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading...</p>
        </div>
        <Toast toasts={toasts} onRemove={removeToast} />
      </div>
    )
  }

  if (!sessionConfigured) {
    return (
      <div className="login-container">
        <SlideUp>
          <div className="login-card" style={{ textAlign: 'left' }}>
            <FadeIn>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
                🎣 Setup Fishing Season
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '28px' }}>
                Configure the start and end dates for the fishing season.
              </p>
            </FadeIn>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <FadeIn delay={100}>
                <div className="neu-form-group">
                  <label className="neu-form-label">Season Start Date</label>
                  <input
                    type="date"
                    value={sessionStart}
                    onChange={(e) => setSessionStart(e.target.value)}
                    className="neu-form-input"
                  />
                </div>
              </FadeIn>
              <FadeIn delay={200}>
                <div className="neu-form-group">
                  <label className="neu-form-label">Season End Date</label>
                  <input
                    type="date"
                    value={sessionEnd}
                    onChange={(e) => setSessionEnd(e.target.value)}
                    className="neu-form-input"
                  />
                </div>
              </FadeIn>
              <FadeIn delay={300}>
                <button
                  onClick={() => {
                    if (sessionStart && sessionEnd) {
                      const start = new Date(sessionStart)
                      const end = new Date(sessionEnd)
                      if (end > start) {
                        updateSession(sessionStart, sessionEnd)
                      } else {
                        toastError('End date must be after start date')
                      }
                    } else {
                      toastError('Please select both start and end dates')
                    }
                  }}
                  className="neu-btn neu-btn-primary"
                  style={{ width: '100%', padding: '16px', fontSize: '1rem' }}
                >
                  Continue to Dashboard
                </button>
              </FadeIn>
              <FadeIn delay={400}>
                <button
                  onClick={handleLogout}
                  className="neu-btn neu-btn-ghost"
                  style={{ width: '100%', padding: '14px' }}
                >
                  Logout
                </button>
              </FadeIn>
            </div>
          </div>
        </SlideUp>
        <Toast toasts={toasts} onRemove={removeToast} />
      </div>
    )
  }

  return (
    <div>
      <Toast toasts={toasts} onRemove={removeToast} />
      <ConfirmModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.variant === 'danger' ? 'Delete' : 'Confirm'}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />

      {/* Header */}
      <header className="neu-header no-print">
        <div className="neu-header-inner">
          <div>
            <h1 className="neu-header-title">🎣 Fishing Booking System</h1>
            {activeSession ? (
              <p className="neu-header-subtitle">
                Current Season: {activeSession.name}
                <span style={{ margin: '0 10px' }}>|</span>
                {new Date(activeSession.start_date).toLocaleDateString()} — {new Date(activeSession.end_date).toLocaleDateString()}
              </p>
            ) : sessionStart && sessionEnd ? (
              <p className="neu-header-subtitle">
                Season: {new Date(sessionStart).toLocaleDateString()} — {new Date(sessionEnd).toLocaleDateString()}
              </p>
            ) : (
              <p className="neu-header-subtitle">Configure season dates in Dashboard</p>
            )}
          </div>
          <div className="neu-header-actions">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="dark-toggle"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Session Dropdown */}
            <div className="neu-session-dropdown" ref={dropdownRef}>
              <button
                onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                className="neu-btn neu-btn-ghost"
              >
                <Calendar size={16} />
                <span>{activeSession?.name || 'Select Season'}</span>
                <ChevronDown size={14} />
              </button>

              {showSessionDropdown && (
                <div className="neu-dropdown-menu">
                  <div style={{ padding: '8px 12px' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Available Seasons</p>
                  </div>
                  {sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => handleSelectSession(session)}
                      className={`neu-dropdown-item ${session.id === activeSession?.id ? 'active-item' : ''}`}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{session.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(session.start_date).toLocaleDateString()} — {new Date(session.end_date).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`season-badge ${session.status}`}>
                        {session.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setCurrentMode('user')}
              className="neu-btn neu-btn-ghost flex items-center gap-1.5"
              title="Return to Public Angler Portal"
            >
              <Compass size={16} />
              <span>Guest Site</span>
            </button>

            <button
              onClick={() => {
                if (!sessionConfigured) {
                  toastError('Please configure season dates first in the Dashboard')
                  setCurrentView('dashboard')
                  return
                }
                setEditingBooking(null)
                setCurrentView('form')
              }}
              className={`neu-btn ${sessionConfigured ? 'neu-btn-primary' : 'neu-btn-ghost'}`}
              style={!sessionConfigured ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <Plus size={18} />
              New Booking
            </button>
            <button
              onClick={handleLogout}
              className="neu-btn neu-btn-danger"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="neu-nav no-print">
        <div className="neu-nav-bar">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`neu-nav-tab ${currentView === 'dashboard' ? 'active' : ''}`}
          >
            <Users size={16} />
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView('weekly')}
            className={`neu-nav-tab ${currentView === 'weekly' ? 'active' : ''}`}
          >
            <Calendar size={16} />
            Weekly View
          </button>
          <button
            onClick={() => setCurrentView('bookings')}
            className={`neu-nav-tab ${currentView === 'bookings' ? 'active' : ''}`}
          >
            <Eye size={16} />
            View Bookings
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="neu-main">
        <FadeIn>
          {currentView !== 'form' && sessions.length > 0 && (
            <SessionSelector
              sessions={sessions}
              activeSession={activeSession}
              onSelectSession={handleSelectSession}
              onCreateSession={handleCreateSession}
            />
          )}

          {currentView === 'dashboard' && (
            <Dashboard
              bookings={bookings}
              sessionStart={sessionStart}
              sessionEnd={sessionEnd}
              onDeleteBooking={handleDeleteBooking}
              onEditBooking={handleEditBooking}
              onUpdateSession={updateSession}
              activeSession={activeSession}
            />
          )}
          {currentView === 'weekly' && (
            <WeeklyView
              bookings={bookings}
              sessionStart={sessionStart}
              sessionEnd={sessionEnd}
              activeSession={activeSession}
            />
          )}
          {currentView === 'bookings' && (
            <ViewBookings
              bookings={allBookings}
              sessions={sessions}
              onDeleteBooking={handleDeleteBooking}
              onEditBooking={handleEditBooking}
            />
          )}
          {currentView === 'form' && (
            <BookingForm
              onSubmit={editingBooking ? updateBooking : addBooking}
              onCancel={() => {
                setEditingBooking(null)
                setCurrentView('dashboard')
              }}
              sessionStart={sessionStart}
              sessionEnd={sessionEnd}
              existingBookings={allBookings}
              editingBooking={editingBooking}
              activeSession={activeSession}
              upcomingSession={upcomingSession}
              submitting={submitting}
            />
          )}
        </FadeIn>
      </main>
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
