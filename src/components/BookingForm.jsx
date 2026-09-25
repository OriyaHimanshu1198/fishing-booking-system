import { useState, useEffect } from 'react'
import { getWeeksInSession, BEATS, formatDate, getAvailableBeatsForDay, autoAssignBeats } from '../utils/dateHelpers'

function BookingForm({ onSubmit, onCancel, sessionStart, sessionEnd, existingBookings, editingBooking, activeSession, upcomingSession, submitting }) {
  const [selectedSession, setSelectedSession] = useState(activeSession)

  // Use selected session dates for week calculation
  // Build session options: active + upcoming
  const sessionOptions = [activeSession, upcomingSession].filter(Boolean)

  const currentSession = selectedSession || activeSession
  const allWeeks = getWeeksInSession(
    currentSession?.start_date || sessionStart,
    currentSession?.end_date || sessionEnd
  )

  // Filter out past weeks - only show current and future weeks
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weeks = allWeeks.filter(week => {
    const weekEnd = new Date(week.endDate)
    weekEnd.setHours(0, 0, 0, 0)
    return weekEnd >= today
  })

  const [name, setName] = useState(editingBooking?.name || '')
  const [email, setEmail] = useState(editingBooking?.email || '')
  const [phone, setPhone] = useState(editingBooking?.phone || '')
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(() => {
    if (editingBooking) {
      return weeks.findIndex(w => w.weekNumber === editingBooking.week)
    }
    return 0
  })
  const [bookingType, setBookingType] = useState(editingBooking?.booking_type || 'consecutive')
  const [selectedDays, setSelectedDays] = useState(() => {
    if (editingBooking?.beat_allocations) {
      return Object.keys(editingBooking.beat_allocations).map(Number).sort((a, b) => a - b)
    }
    return []
  })
  const [manualBeatAllocations, setManualBeatAllocations] = useState(editingBooking?.beat_allocations || {})
  const [errors, setErrors] = useState({})

  const currentWeek = weeks[selectedWeekIndex]

  useEffect(() => {
    setSelectedDays([])
    setManualBeatAllocations({})
  }, [bookingType, selectedWeekIndex])

  const toggleDay = (dayIndex) => {
    if (selectedDays.includes(dayIndex)) {
      const newDays = selectedDays.filter(d => d !== dayIndex)
      setSelectedDays(newDays)
      // Remove beat allocation for this day
      const newAllocations = { ...manualBeatAllocations }
      delete newAllocations[dayIndex]
      setManualBeatAllocations(newAllocations)
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort((a, b) => a - b))
    }
  }

  const handleBeatSelection = (dayIndex, beat) => {
    setManualBeatAllocations({
      ...manualBeatAllocations,
      [dayIndex]: beat
    })
  }

  const validateForm = () => {
    const newErrors = {}
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/

    if (!name.trim()) {
      newErrors.name = 'Full name is required'
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email (e.g., name@example.com)'
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    if (selectedDays.length === 0) {
      newErrors.days = 'Please select at least 1 day to book.'
    }

    if (bookingType === 'flexible') {
      for (const dayIndex of selectedDays) {
        if (!manualBeatAllocations[dayIndex]) {
          newErrors.beats = 'Please select a beat/loch for each selected day.'
          break
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validateForm()) return

    let beatAllocations

    if (bookingType === 'consecutive') {
      beatAllocations = autoAssignBeats(currentWeek.weekNumber, selectedDays, existingBookings, editingBooking?.id)

      if (!beatAllocations) {
        setErrors({ general: 'Unable to auto-assign beats. Some days may be fully booked. Try flexible booking instead.' })
        return
      }
    } else {
      beatAllocations = manualBeatAllocations
    }

    const bookingData = {
      name,
      email,
      phone,
      week: currentWeek.weekNumber,
      days_count: selectedDays.length,
      booking_type: bookingType,
      beat_allocations: beatAllocations,
      session_id: currentSession?.id || null
    }

    if (editingBooking) {
      onSubmit({ ...bookingData, id: editingBooking.id })
    } else {
      onSubmit(bookingData)
    }
  }

  return (
    <div className="neu-form-card animate-slide-up">
      <h2 className="neu-form-title">
        {editingBooking ? 'Edit Booking' : 'Create New Booking'}
      </h2>

      {errors.general && (
        <div className="neu-alert neu-alert-error animate-fade-in">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Session selector (only if there are multiple sessions) */}
        {sessionOptions.length > 1 && !editingBooking && (
          <div className="neu-alert neu-alert-info" style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-orange)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Select Season
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {sessionOptions.map(session => (
                <label
                  key={session.id}
                  className={`neu-radio-card ${currentSession?.id === session.id ? 'selected' : ''}`}
                  style={{ flex: 1, cursor: 'pointer' }}
                >
                  <input
                    type="radio"
                    name="sessionSelect"
                    checked={currentSession?.id === session.id}
                    onChange={() => setSelectedSession(session)}
                    style={{ display: 'none' }}
                  />
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-dark)', marginBottom: '4px' }}>
                    {session.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(session.start_date).toLocaleDateString()} — {new Date(session.end_date).toLocaleDateString()}
                  </div>
                  {session.status === 'upcoming' && (
                    <span style={{
                      display: 'inline-block',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '20px',
                      background: 'rgba(66, 153, 225, 0.15)',
                      color: 'var(--accent-blue)',
                      marginTop: '8px',
                    }}>
                      Advance Booking
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Person details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', marginBottom: '28px' }}>
          <div className="neu-form-group" style={{ marginBottom: 0 }}>
            <label className="neu-form-label">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="neu-form-input"
            />
            {errors.name && <span className="neu-error">{errors.name}</span>}
          </div>

          <div className="neu-form-group" style={{ marginBottom: 0 }}>
            <label className="neu-form-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.smith@example.com"
              className="neu-form-input"
            />
            {errors.email && <span className="neu-error">{errors.email}</span>}
          </div>

          <div className="neu-form-group" style={{ marginBottom: 0 }}>
            <label className="neu-form-label">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 20 7946 0958"
              className="neu-form-input"
            />
            {errors.phone && <span className="neu-error">{errors.phone}</span>}
          </div>
        </div>

        {/* Week selection */}
        <div className="neu-form-group">
          <label className="neu-form-label">Select Week</label>
          <select
            value={selectedWeekIndex}
            onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
            className="neu-form-input"
          >
            {weeks.map((week, idx) => (
              <option key={week.weekNumber} value={idx}>
                Week {week.weekNumber} ({formatDate(week.startDate)} - {formatDate(week.endDate)})
              </option>
            ))}
          </select>
        </div>

        {/* Booking Type */}
        <div className="neu-form-group" style={{ borderTop: '2px solid var(--bg-inset)', paddingTop: '24px' }}>
          <label className="neu-form-label">Booking Type</label>
          <div className="day-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <label className={`neu-radio-card ${bookingType === 'consecutive' ? 'selected' : ''}`} style={{ cursor: 'pointer', textAlign: 'left' }}>
              <input
                type="radio"
                name="bookingType"
                value="consecutive"
                checked={bookingType === 'consecutive'}
                onChange={() => setBookingType('consecutive')}
                style={{ display: 'none' }}
              />
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-dark)', marginBottom: '4px' }}>
                Consecutive Days
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Auto-assign with weekly rotation
              </div>
            </label>

            <label className={`neu-radio-card ${bookingType === 'flexible' ? 'selected' : ''}`} style={{ cursor: 'pointer', textAlign: 'left' }}>
              <input
                type="radio"
                name="bookingType"
                value="flexible"
                checked={bookingType === 'flexible'}
                onChange={() => setBookingType('flexible')}
                style={{ display: 'none' }}
              />
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-dark)', marginBottom: '4px' }}>
                Flexible
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Choose beat/loch for each day
              </div>
            </label>
          </div>
        </div>

        {/* Day Selection */}
        {currentWeek && (
          <div className="neu-form-group" style={{ borderTop: '2px solid var(--bg-inset)', paddingTop: '24px' }}>
            <label className="neu-form-label">Select Days (Monday — Saturday)</label>
            <div className="day-grid">
              {currentWeek.days.map((day, dayIndex) => {
                const isSelected = selectedDays.includes(dayIndex)
                const availableBeats = getAvailableBeatsForDay(currentWeek.weekNumber, dayIndex, existingBookings, editingBooking?.id)
                const isFullyBooked = availableBeats.length === 0

                return (
                  <button
                    key={dayIndex}
                    type="button"
                    disabled={isFullyBooked}
                    onClick={() => toggleDay(dayIndex)}
                    className={`day-btn ${isSelected ? 'selected' : ''} ${isFullyBooked ? 'unavailable' : ''}`}
                  >
                    <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{day.getDate()}</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>
                      {day.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    {isFullyBooked && (
                      <span style={{ fontSize: '0.55rem', color: 'var(--accent-red)', fontWeight: 700, marginTop: '2px' }}>Full</span>
                    )}
                  </button>
                )
              })}
            </div>
            {errors.days && <span className="neu-error">{errors.days}</span>}
          </div>
        )}

        {/* Manual Beat Selection for Flexible Booking */}
        {bookingType === 'flexible' && selectedDays.length > 0 && currentWeek && (
          <div className="neu-form-group" style={{ borderTop: '2px solid var(--bg-inset)', paddingTop: '24px' }}>
            <label className="neu-form-label">Select Beat/Loch for Each Day</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {selectedDays.map((dayIndex) => {
                const day = currentWeek.days[dayIndex]
                const availableBeats = getAvailableBeatsForDay(currentWeek.weekNumber, dayIndex, existingBookings, editingBooking?.id)

                return (
                  <div key={dayIndex} className="neu-raised" style={{ padding: '18px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '12px' }}>
                      {day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="day-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
                      {BEATS.map((beat) => {
                        const isAvailable = availableBeats.includes(beat)
                        const isSelected = manualBeatAllocations[dayIndex] === beat

                        return (
                          <button
                            key={beat}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => handleBeatSelection(dayIndex, beat)}
                            className={`day-btn ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                            style={{ fontSize: '0.7rem', padding: '12px 6px' }}
                          >
                            {beat}
                            {!isAvailable && <span style={{ fontSize: '0.55rem' }}>(Booked)</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            {errors.beats && <span className="neu-error">{errors.beats}</span>}
          </div>
        )}

        {/* Preview for Consecutive Booking */}
        {bookingType === 'consecutive' && selectedDays.length > 0 && currentWeek && (
          <div className="neu-alert neu-alert-info" style={{ marginTop: '8px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '8px' }}>
              Preview: Auto-Assignment (Rotation)
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Each beat used once per day — beats rotate across bookings
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {(() => {
                const previewAllocations = autoAssignBeats(currentWeek.weekNumber, selectedDays, existingBookings, editingBooking?.id)
                if (!previewAllocations) {
                  return <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)' }}>⚠️ Cannot auto-assign — some days fully booked</span>
                }
                return selectedDays.map((dayIndex) => {
                  const day = currentWeek.days[dayIndex]
                  const assignedBeat = previewAllocations[dayIndex]
                  return (
                    <div key={dayIndex} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-dark)' }}>
                      <span>{day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{assignedBeat}</span>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '14px', marginTop: '32px', borderTop: '2px solid var(--bg-inset)', paddingTop: '24px' }}>
          <button
            type="submit"
            className={`neu-btn neu-btn-primary ${submitting ? 'loading' : ''}`}
            style={{ flex: 1, padding: '16px' }}
            disabled={submitting}
          >
            {editingBooking ? 'Update Booking' : 'Confirm & Save Booking'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="neu-btn neu-btn-ghost"
            style={{ flex: 1, padding: '16px' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default BookingForm
