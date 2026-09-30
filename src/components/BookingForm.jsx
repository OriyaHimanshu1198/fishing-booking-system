import { useState, useEffect } from 'react'
import {
  getWeeksInSession,
  BEATS,
  formatDate,
  getAvailableBeatsForDay,
  autoAssignBeats
} from '../utils/dateHelpers'
import RiverMap, { BEAT_DETAILS } from './RiverMap'
import {
  Sparkles,
  MapPin,
  Calendar,
  User,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Compass
} from 'lucide-react'

function BookingForm({
  onSubmit,
  onCancel,
  sessionStart,
  sessionEnd,
  existingBookings,
  editingBooking,
  activeSession,
  upcomingSession,
  submitting
}) {
  const [selectedSession, setSelectedSession] = useState(activeSession)

  const sessionOptions = [activeSession, upcomingSession].filter(Boolean)
  const currentSession = selectedSession || activeSession
  const allWeeks = getWeeksInSession(
    currentSession?.start_date || sessionStart,
    currentSession?.end_date || sessionEnd
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const seasonStart = new Date(currentSession?.start_date || sessionStart || '2026-03-01')
  const isUpcomingSeason = seasonStart > today
  const weeks = allWeeks.filter(week => {
    const weekEnd = new Date(week.endDate)
    weekEnd.setHours(0, 0, 0, 0)
    return isUpcomingSeason || weekEnd >= today
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
  const [activeDayForMap, setActiveDayForMap] = useState(null)
  const [showRiverMapGuide, setShowRiverMapGuide] = useState(true)
  const [errors, setErrors] = useState({})

  const currentWeek = weeks[selectedWeekIndex]

  const isDayPassed = (day) => {
    const d = new Date(day)
    d.setHours(0, 0, 0, 0)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return d < now
  }

  useEffect(() => {
    setSelectedDays([])
    setManualBeatAllocations({})
    setActiveDayForMap(null)
  }, [bookingType, selectedWeekIndex])

  const toggleDay = (dayIndex) => {
    if (selectedDays.includes(dayIndex)) {
      const newDays = selectedDays.filter(d => d !== dayIndex)
      setSelectedDays(newDays)
      const newAllocations = { ...manualBeatAllocations }
      delete newAllocations[dayIndex]
      setManualBeatAllocations(newAllocations)
      if (activeDayForMap === dayIndex) {
        setActiveDayForMap(newDays[0] ?? null)
      }
    } else {
      const newDays = [...selectedDays, dayIndex].sort((a, b) => a - b)
      setSelectedDays(newDays)
      if (activeDayForMap === null) {
        setActiveDayForMap(dayIndex)
      }
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

  // Active day index for interactive map selection
  const currentMapDayIndex = activeDayForMap !== null && selectedDays.includes(activeDayForMap)
    ? activeDayForMap
    : selectedDays[0] ?? null

  const currentMapDayDate = currentMapDayIndex !== null && currentWeek?.days[currentMapDayIndex]
    ? currentWeek.days[currentMapDayIndex]
    : null

  const availableBeatsForActiveDay = currentMapDayIndex !== null && currentWeek
    ? getAvailableBeatsForDay(currentWeek.weekNumber, currentMapDayIndex, existingBookings, editingBooking?.id)
    : BEATS

  const consecutivePreview = bookingType === 'consecutive' && selectedDays.length > 0 && currentWeek
    ? autoAssignBeats(currentWeek.weekNumber, selectedDays, existingBookings, editingBooking?.id)
    : null

  return (
    <div className="max-w-7xl mx-auto animate-slide-up">
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Compass className="w-7 h-7 text-emerald-500" />
            {editingBooking ? 'Edit Booking Reservation' : 'Reserve Your Fishing Trip'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Choose your season, select your fishing week, and assign your river beats.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowRiverMapGuide(!showRiverMapGuide)}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-2 shadow-sm"
        >
          <MapPin className="w-4 h-4 text-emerald-500" />
          {showRiverMapGuide ? 'Hide River Map Guide' : 'Show River Map Guide'}
        </button>
      </div>

      {errors.general && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-3 text-sm font-medium animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {errors.general}
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Beat Map (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSubmit} className="neu-form-card space-y-6">
            {/* Season Selector */}
            {sessionOptions.length > 1 && !editingBooking && (
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3">
                  Select Season
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sessionOptions.map(session => (
                    <label
                      key={session.id}
                      className={`
                        p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between
                        ${currentSession?.id === session.id
                          ? 'bg-white dark:bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="sessionSelect"
                        checked={currentSession?.id === session.id}
                        onChange={() => setSelectedSession(session)}
                        className="hidden"
                      />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-800 dark:text-white">{session.name}</span>
                        {session.status === 'upcoming' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            Advance Booking
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {new Date(session.start_date).toLocaleDateString()} — {new Date(session.end_date).toLocaleDateString()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Guest Details */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-500" /> Guest & Angler Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="neu-form-label">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alexander Stewart"
                    className="neu-form-input w-full"
                  />
                  {errors.name && <span className="neu-error">{errors.name}</span>}
                </div>

                <div>
                  <label className="neu-form-label">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@highland.co.uk"
                    className="neu-form-input w-full"
                  />
                  {errors.email && <span className="neu-error">{errors.email}</span>}
                </div>

                <div>
                  <label className="neu-form-label">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 7911 123456"
                    className="neu-form-input w-full"
                  />
                  {errors.phone && <span className="neu-error">{errors.phone}</span>}
                </div>
              </div>
            </div>

            {/* Week Selection */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="neu-form-label flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-500" /> Select Fishing Week
              </label>
              <select
                value={selectedWeekIndex}
                onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
                className="neu-form-input w-full font-semibold"
              >
                {weeks.map((week, idx) => (
                  <option key={week.weekNumber} value={idx}>
                    Week {week.weekNumber} ({formatDate(week.startDate)} - {formatDate(week.endDate)})
                  </option>
                ))}
              </select>
            </div>

            {/* Booking Type Options */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="neu-form-label flex items-center justify-between">
                <span>Booking Experience</span>
                <span className="text-[11px] font-normal text-slate-400">Choose how your beats are assigned</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label
                  className={`
                    p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between
                    ${bookingType === 'consecutive'
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="bookingType"
                    value="consecutive"
                    checked={bookingType === 'consecutive'}
                    onChange={() => setBookingType('consecutive')}
                    className="hidden"
                  />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800 dark:text-white">Consecutive Days</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">Recommended</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Fair daily beat rotation. Fish a different beat every day throughout your stay.
                    </p>
                  </div>
                </label>

                <label
                  className={`
                    p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between
                    ${bookingType === 'flexible'
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="bookingType"
                    value="flexible"
                    checked={bookingType === 'flexible'}
                    onChange={() => setBookingType('flexible')}
                    className="hidden"
                  />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800 dark:text-white">Custom / Flexible</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">Custom</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Manually select specific beats or the loch for each individual fishing day.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Day Selector Chips */}
            {currentWeek && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="neu-form-label mb-0">Select Fishing Days (Mon — Sat)</label>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedDays.length} of 6 days selected
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {currentWeek.days.map((day, dayIndex) => {
                    const isSelected = selectedDays.includes(dayIndex)
                    const availableBeats = getAvailableBeatsForDay(currentWeek.weekNumber, dayIndex, existingBookings, editingBooking?.id)
                    const isFullyBooked = availableBeats.length === 0
                    const passed = isDayPassed(day)

                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        disabled={isFullyBooked || passed}
                        onClick={() => !passed && toggleDay(dayIndex)}
                        className={`
                          p-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-150
                          ${isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-102 font-bold ring-2 ring-emerald-400/30'
                            : isFullyBooked || passed
                              ? 'bg-slate-100 dark:bg-slate-900/60 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                          }
                        `}
                      >
                        <span className="text-[11px] uppercase font-semibold">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-black my-0.5">{day.getDate()}</span>
                        <span className="text-[10px] opacity-75">
                          {day.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        {isFullyBooked && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 mt-1">
                            Full
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {errors.days && <span className="neu-error mt-2 block">{errors.days}</span>}
              </div>
            )}

            {/* Flexible Beat Assignment via River Map or Quick Chips */}
            {bookingType === 'flexible' && selectedDays.length > 0 && currentWeek && (
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                      Assign Beats for Selected Days
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pick a day below, then choose your beat from the river map or buttons.
                    </p>
                  </div>

                  {/* Day tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {selectedDays.map((dayIndex) => {
                      const day = currentWeek.days[dayIndex]
                      const isDayActive = currentMapDayIndex === dayIndex
                      const assignedBeat = manualBeatAllocations[dayIndex]

                      return (
                        <button
                          key={dayIndex}
                          type="button"
                          onClick={() => setActiveDayForMap(dayIndex)}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5
                            ${isDayActive
                              ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-white border-transparent shadow'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }
                          `}
                        >
                          <span>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          {assignedBeat ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                              {assignedBeat}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-500">⚠️</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Quick Beat Selector for Current Day */}
                {currentMapDayIndex !== null && currentMapDayDate && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Available for {currentMapDayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}:</span>
                      {manualBeatAllocations[currentMapDayIndex] && (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selected: {manualBeatAllocations[currentMapDayIndex]}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      {BEATS.map((beat) => {
                        const isAvailable = availableBeatsForActiveDay.includes(beat)
                        const isSelected = manualBeatAllocations[currentMapDayIndex] === beat

                        return (
                          <button
                            key={beat}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => handleBeatSelection(currentMapDayIndex, beat)}
                            className={`
                              p-2.5 rounded-lg text-xs font-bold border transition-all text-center
                              ${isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-400/20'
                                : isAvailable
                                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                                  : 'bg-slate-100 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50'
                              }
                            `}
                          >
                            <div>{beat}</div>
                            <div className="text-[10px] font-normal opacity-75 mt-0.5">
                              {isAvailable ? (isSelected ? '✓ Assigned' : 'Available') : 'Booked'}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {errors.beats && <span className="neu-error block">{errors.beats}</span>}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-4 px-6 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <span>Saving Reservation...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {editingBooking ? 'Update Booking' : 'Confirm & Reserve Trip'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-4 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Interactive River Map (Embedded) */}
          {showRiverMapGuide && (
            <div className="mt-6">
              <RiverMap
                interactive={bookingType === 'flexible' && currentMapDayIndex !== null}
                activeDayLabel={currentMapDayDate ? currentMapDayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                availableBeats={availableBeatsForActiveDay}
                selectedBeat={currentMapDayIndex !== null ? manualBeatAllocations[currentMapDayIndex] : null}
                onSelectBeat={(beat) => {
                  if (currentMapDayIndex !== null) {
                    handleBeatSelection(currentMapDayIndex, beat)
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Right Column: Sticky Live Trip Summary (4 cols) */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Trip Summary
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {bookingType === 'consecutive' ? 'Consecutive' : 'Flexible'}
              </span>
            </div>

            {/* Guest Summary */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Angler</span>
                <span className="font-semibold text-white">{name.trim() || 'Guest Angler'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Week</span>
                <span className="font-semibold text-white">#{currentWeek?.weekNumber || 1}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Dates</span>
                <span className="font-semibold text-white">
                  {currentWeek ? `${formatDate(currentWeek.startDate)} — ${formatDate(currentWeek.endDate)}` : 'Select week'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Days Booked</span>
                <span className="font-bold text-emerald-400">{selectedDays.length} day(s)</span>
              </div>
            </div>

            {/* Beat Schedule Timeline */}
            <div className="pt-3 border-t border-slate-800/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                Daily Beat Schedule
              </span>

              {selectedDays.length === 0 ? (
                <div className="text-xs text-slate-500 py-3 text-center bg-slate-950/60 rounded-xl border border-slate-800/50">
                  Select days above to preview your beat schedule
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDays.map((dayIndex) => {
                    const day = currentWeek?.days[dayIndex]
                    const beat = bookingType === 'consecutive'
                      ? consecutivePreview?.[dayIndex] || 'Auto-assigning...'
                      : manualBeatAllocations[dayIndex] || 'Pending selection'

                    const beatInfo = BEAT_DETAILS[beat]

                    return (
                      <div
                        key={dayIndex}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-300">
                            {day?.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="text-slate-300">{day?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <span className={`font-bold ${beat.includes('Pending') ? 'text-amber-400' : 'text-emerald-400'} flex items-center gap-1`}>
                          {beatInfo?.icon} {beat}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Estate Etiquette Card */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-slate-300 space-y-1">
              <div className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> What's Included
              </div>
              <p className="text-slate-400 leading-relaxed">
                Full day river beat access (8:00 AM – 8:00 PM), ghillie orientation on Day 1, and rod room locker.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingForm

