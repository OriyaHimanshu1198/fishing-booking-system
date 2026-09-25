import { useState, useMemo } from 'react'
import {
  Calendar,
  CheckCircle,
  Search,
  Mail,
  ArrowRight,
  Download,
  Printer,
  Lock,
  Sun,
  Moon,
  Compass,
  Sparkles,
  MapPin,
  Check
} from 'lucide-react'
import { getWeeksInSession, BEATS, formatDate, getBeatForDay } from '../utils/dateHelpers'
import BookingForm from './BookingForm'
import heroImage from '../assets/hero.png'
import jsPDF from 'jspdf'

const BEAT_DESCRIPTIONS = {
  'Beat 1': {
    title: 'The Upper Run',
    desc: 'Fast-flowing streams, rocky pools, and excellent holding water for wild brown trout and Atlantic salmon.',
    depth: '1.2m – 2.5m',
    wading: 'Moderate wading with felt or studded soles recommended.'
  },
  'Beat 2': {
    title: 'Salmon Pool & Shallows',
    desc: 'Deep resting pools where salmon congregate before the river bend. Prime dry fly and nymph territory.',
    depth: '1.8m – 3.2m',
    wading: 'Easy bank casting; boat access available on request.'
  },
  'Beat 3': {
    title: 'The Meadow Streams',
    desc: 'Gentle glides through natural meadows. Renowned for evening hatches and selective surface feeders.',
    depth: '0.8m – 1.8m',
    wading: 'Very easy wading with gentle gravel beds.'
  },
  'Beat 4': {
    title: 'The Falls Rapids',
    desc: 'Oxygen-rich rapids below the weir. High action during early morning and late afternoon spates.',
    depth: '1.5m – 2.8m',
    wading: 'Caution advised around bedrock edges.'
  },
  'Beat 5': {
    title: 'The Estuary Bend',
    desc: 'Wide, meandering currents with tree-lined banks. Outstanding sea trout runs under twilight.',
    depth: '1.5m – 3.5m',
    wading: 'Bank angling and platform access provided.'
  },
  'Loch': {
    title: 'Highland Loch Waters',
    desc: 'Serene loch fishing featuring boat and bank beats. Ideal for traditional wet fly drift fishing.',
    depth: '3.0m – 12.0m',
    wading: 'Boat or designated bank casting only.'
  }
}

export default function UserPortal({
  sessions,
  activeSession,
  upcomingSession,
  sessionStart,
  sessionEnd,
  bookings,
  allBookings,
  onAddBooking,
  onSwitchToAdmin,
  submitting,
  darkMode,
  onToggleDarkMode
}) {
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'availability' | 'book' | 'lookup'
  const [selectedSeasonId, setSelectedSeasonId] = useState(activeSession?.id || (sessions[0]?.id) || '')
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  const [lookupEmail, setLookupEmail] = useState('')
  const [lookupResults, setLookupResults] = useState(null)
  const [lookupSearched, setLookupSearched] = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState(null)
  const [selectedBeatInfo, setSelectedBeatInfo] = useState('Beat 1')

  const selectedSeason = sessions.find(s => s.id === selectedSeasonId) || activeSession || sessions[0]
  const currentSession = selectedSeason || activeSession || sessions[0]

  const weeks = useMemo(() => {
    return getWeeksInSession(
      selectedSeason?.start_date || sessionStart || '2026-03-01',
      selectedSeason?.end_date || sessionEnd || '2026-10-31'
    )
  }, [selectedSeason, sessionStart, sessionEnd])

  const currentWeek = weeks[selectedWeekIndex] || weeks[0]

  // Lookup bookings by email or phone
  const handleLookup = (e) => {
    e.preventDefault()
    if (!lookupEmail.trim()) return

    const query = lookupEmail.trim().toLowerCase(); const bkQuery = lookupEmail.trim().toUpperCase().startsWith('BK-') ? lookupEmail.trim().toUpperCase() : null
    const found = allBookings.filter((b) => {
      const matchEmail = b.email && b.email.toLowerCase() === query
      const matchPhone = b.phone && b.phone.replace(/\s+/g, '') === query.replace(/\s+/g, '')
      const matchId = String(b.id).toLowerCase() === query
      const matchBookingRef = bkQuery && String(b.booking_ref || '').toUpperCase() === bkQuery
      return matchEmail || matchPhone || matchId || matchBookingRef
    })

    setLookupResults(found)
    setLookupSearched(true)
  }

  // Handle booking form submission from user portal
  const handleUserBookingSubmit = async (bookingData) => {
    await onAddBooking(bookingData)
    setConfirmedBooking(bookingData)
    setActiveTab('success')
  }

  // PDF download for booking receipt
  const downloadReceiptPdf = (booking) => {
    try {
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.setTextColor(42, 157, 143)
      doc.text('Fishing Booking Confirmation', 14, 22)

      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Booking Ref: ${booking.booking_ref || (booking.id ? 'BK-' + String(booking.id).padStart(5,'0') : 'BK-00001')}`, 14, 30)
      doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, 14, 36)

      doc.setDrawColor(200)
      doc.line(14, 40, 196, 40)

      doc.setFontSize(12)
      doc.setTextColor(30)
      doc.text(`Guest: ${booking.name}`, 14, 50)
      doc.text(`Email: ${booking.email}`, 14, 58)
      doc.text(`Phone: ${booking.phone}`, 14, 66)
      doc.text(`Season: ${currentSession?.name || 'Active Season'}`, 14, 74)
      doc.text(`Week Number: Week ${booking.week}`, 14, 82)
      doc.text(`Days Booked: ${booking.days_count} day(s)`, 14, 90)
      doc.text(`Booking Type: ${booking.booking_type === 'consecutive' ? 'Consecutive Rotation' : 'Flexible Selection'}`, 14, 98)

      doc.line(14, 106, 196, 106)
      doc.setFontSize(14)
      doc.text('Beat Schedule', 14, 116)

      doc.setFontSize(11)
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      let y = 126
      if (booking.beat_allocations) {
        doc.setFontSize(10)
        doc.text('Beat / Dates', 14, y)
        y += 8
        const weekStart = currentWeek?.startDate || new Date().toISOString()
        Object.entries(booking.beat_allocations).forEach(([dayIdx, beat]) => {
          const d = new Date(weekStart)
          d.setDate(d.getDate() + Number(dayIdx))
          const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Number(dayIdx)] || `Day ${Number(dayIdx) + 1}`
          doc.text(`${dayName} (${dateStr}):`, 20, y)
          doc.text(`${beat}`, 90, y)
          y += 7
        })
      }

      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.text('Please arrive 30 minutes prior to fishing start. Bring license and photo ID.', 14, y + 16)

      doc.save(`Fishing-Booking-Week-${booking.week}-${booking.name.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
    }
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Public Top Header */}
      <header className="neu-header">
        <div className="neu-header-inner flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl" role="img" aria-label="Fishing">🎣</span>
            <div>
              <h1 className="neu-header-title text-xl font-bold tracking-tight">
                River & Loch Angling
              </h1>
              <p className="neu-header-subtitle text-xs text-muted-foreground">
                {currentSession?.name || 'Fishing Season'} · {currentSession?.start_date} to {currentSession?.end_date}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="neu-header-actions flex items-center gap-2">
            <button
              onClick={onToggleDarkMode}
              className="dark-toggle p-2 rounded-xl"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => setActiveTab('book')}
              className="neu-btn neu-btn-primary flex items-center gap-2 text-sm font-semibold"
            >
              <Calendar size={16} />
              Book Fishing
            </button>

            <button
              onClick={onSwitchToAdmin}
              className="neu-btn neu-btn-ghost flex items-center gap-1.5 text-xs text-muted-foreground"
              title="Staff & Management Login"
            >
              <Lock size={14} />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Public Navigation Tabs */}
      <nav className="neu-nav no-print">
        <div className="neu-nav-bar flex flex-wrap gap-2 justify-center max-w-4xl mx-auto py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`neu-nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <Compass size={16} />
            Season & Beats
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`neu-nav-tab ${activeTab === 'availability' ? 'active' : ''}`}
          >
            <Calendar size={16} />
            Live Availability
          </button>
          <button
            onClick={() => setActiveTab('book')}
            className={`neu-nav-tab ${activeTab === 'book' ? 'active' : ''}`}
          >
            <Sparkles size={16} />
            Book Your Trip
          </button>
          <button
            onClick={() => setActiveTab('lookup')}
            className={`neu-nav-tab ${activeTab === 'lookup' ? 'active' : ''}`}
          >
            <Search size={16} />
            Check My Booking
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="neu-main max-w-7xl mx-auto px-4 mt-6">
        {/* TAB 1: OVERVIEW & BEATS */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Hero Card */}
            <div className="neu-raised rounded-3xl p-6 sm:p-10 relative overflow-hidden flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1 space-y-4 z-10">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {currentSession?.status === 'active' ? '2026 Bookings Now Open' : 'Season Bookings'}
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                  World-Class Salmon & Trout Angling
                </h2>
                <p className="text-base text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                  Fish pristine Scottish highland river beats and scenic loch waters.
                  Featuring our renowned <strong>fair daily rotation system</strong> so every angler
                  experiences all 5 river beats and the loch during consecutive 6-day stays.
                </p>
                <div className="pt-2 flex flex-wrap gap-4">
                  <button
                    onClick={() => setActiveTab('book')}
                    className="neu-btn neu-btn-primary px-6 py-3 font-semibold flex items-center gap-2"
                  >
                    Reserve Your Rod
                    <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => setActiveTab('availability')}
                    className="neu-btn neu-btn-ghost px-5 py-3 font-medium flex items-center gap-2"
                  >
                    View Availability
                  </button>
                </div>
              </div>

              {/* Hero Image */}
              <div className="w-full lg:w-96 rounded-2xl overflow-hidden shadow-xl border border-white/20">
                <img
                  src={heroImage}
                  alt="Highland River Fishing"
                  className="w-full h-64 object-cover transform hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Quick Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="neu-flat p-6 rounded-2xl space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">5 River Beats + 1 Loch</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Six distinct water stretches including fast-flowing shallows, resting pools, meadow glides, and stillwater loch drifts.
                </p>
              </div>

              <div className="neu-flat p-6 rounded-2xl space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  2
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Fair Cyclic Rotation</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Full 6-day consecutive bookings automatically rotate each morning, ensuring every guest enjoys each beat without conflicts.
                </p>
              </div>

              <div className="neu-flat p-6 rounded-2xl space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  3
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Instant Email Itinerary</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Book online and instantly receive a detailed beat schedule confirmation with daily arrival instructions and rules.
                </p>
              </div>
            </div>

            {/* Beat Directory Interactive Guide */}
            <div className="neu-raised rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    The Fishery Beats & Loch Guide
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Click any beat to view water details, depths, and wading conditions.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {BEATS.map((beat) => (
                    <button
                      key={beat}
                      onClick={() => setSelectedBeatInfo(beat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedBeatInfo === beat
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {beat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Beat Detail Box */}
              {BEAT_DESCRIPTIONS[selectedBeatInfo] && (
                <div className="neu-inset rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <MapPin size={22} />
                    </span>
                    <div>
                      <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {selectedBeatInfo}: {BEAT_DESCRIPTIONS[selectedBeatInfo].title}
                      </h4>
                      <p className="text-xs text-slate-500">Water Profile & Angler Notes</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {BEAT_DESCRIPTIONS[selectedBeatInfo].desc}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                    <div className="bg-white/40 dark:bg-black/20 p-3 rounded-xl">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Typical Depth: </span>
                      <span className="text-slate-600 dark:text-slate-400">{BEAT_DESCRIPTIONS[selectedBeatInfo].depth}</span>
                    </div>
                    <div className="bg-white/40 dark:bg-black/20 p-3 rounded-xl">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Wading Advice: </span>
                      <span className="text-slate-600 dark:text-slate-400">{BEAT_DESCRIPTIONS[selectedBeatInfo].wading}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE AVAILABILITY */}
        {activeTab === 'availability' && (
          <div className="space-y-6 animate-fade-in">
            <div className="neu-raised rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    Live Beat Availability Calendar
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Browse open rods by week (Monday through Saturday)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Season:</label>
                  <select
                    value={selectedSeasonId}
                    onChange={(e) => { setSelectedSeasonId(e.target.value); setSelectedWeekIndex(0) }}
                    className="neu-form-input text-sm py-2 px-3 rounded-xl min-w-[200px]"
                  >
                    {sessions.map((s) => (
                      <option key={s.id || s.name} value={s.id || s.name}>
                        {s.name || `Season ${s.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Week:</label>
                  <select
                    value={selectedWeekIndex}
                    onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
                    className="neu-form-input text-sm py-2 px-3 rounded-xl min-w-[240px]"
                  >
                    {weeks.map((w, idx) => {
                      const isPast = new Date(w.endDate) < new Date()
                      return (
                        <option key={w.weekNumber} value={idx} disabled={isPast}>
                          Week {w.weekNumber} ({formatDate(w.startDate)} – {formatDate(w.endDate)}){isPast ? ' — Past' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              {/* Week Calendar Grid */}
              {currentWeek && (
                <div className="overflow-x-auto rounded-2xl neu-inset p-4">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4 font-bold">Beat / Loch</th>
                        {currentWeek.days.map((day, idx) => (
                          <th key={idx} className="py-3 px-4 text-center">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {formatDate(day)}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                      {BEATS.map((beat) => (
                        <tr key={beat} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            {beat}
                          </td>
                          {currentWeek.days.map((_, dayIdx) => {
                            const isBooked = bookings.some(
                              (b) => b.week === currentWeek.weekNumber && getBeatForDay(b, dayIdx) === beat
                            )

                            return (
                              <td key={dayIdx} className="py-2.5 px-3 text-center">
                                {isBooked ? (
                                  <span className="inline-flex items-center justify-center px-2 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                                    Booked
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                                    <Check size={12} className="mr-1" />
                                    Available
                                  </span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action Banner */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-sm">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-teal-600 dark:text-teal-400" size={20} />
                  <span className="text-slate-700 dark:text-slate-200 font-medium">
                    Found your preferred dates in Week {currentWeek?.weekNumber}? Reserve online with instant confirmation.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('book')}
                  className="neu-btn neu-btn-primary px-4 py-2 font-semibold text-xs whitespace-nowrap"
                >
                  Book Week {currentWeek?.weekNumber} Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BOOKING FORM */}
        {activeTab === 'book' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="neu-raised rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Online Angler Reservation
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Fill in your details below to secure your fishing rods.
                </p>
              </div>

              <BookingForm
                onSubmit={handleUserBookingSubmit}
                onCancel={() => setActiveTab('overview')}
                sessionStart={sessionStart}
                sessionEnd={sessionEnd}
                existingBookings={allBookings}
                editingBooking={null}
                activeSession={activeSession}
                upcomingSession={upcomingSession}
                submitting={submitting}
              />
            </div>
          </div>
        )}

        {/* TAB 4: BOOKING SUCCESS RECEIPT */}
        {activeTab === 'success' && confirmedBooking && (
          <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
            <div className="neu-raised rounded-3xl p-8 space-y-6 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle size={36} />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Booking Confirmed!
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Thank you, <strong>{confirmedBooking.name}</strong>. A confirmation email has been dispatched to <strong>{confirmedBooking.email}</strong>.
                </p>
              </div>

              {/* Receipt Card */}
              <div className="neu-inset rounded-2xl p-6 text-left space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Booking Reference</span>
                  <span className="font-mono font-bold text-teal-600">{confirmedBooking.booking_ref || (confirmedBooking.id ? 'BK-' + String(confirmedBooking.id).padStart(5,'0') : 'BK-00001')}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Booking Period</span>
                  <span className="font-bold">Week {confirmedBooking.week} — {formatDate(currentWeek?.startDate) || ''} to {formatDate(currentWeek?.endDate) || ''}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Week Number</span>
                  <span className="font-bold">Week {confirmedBooking.week}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Days Booked</span>
                  <span className="font-bold">{confirmedBooking.days_count} day(s)</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Booking Type</span>
                  <span className="font-bold">
                    {confirmedBooking.booking_type === 'consecutive' ? 'Consecutive Fair Rotation' : 'Flexible Choice'}
                  </span>
                </div>

                {confirmedBooking.beat_allocations && (
                  <div className="pt-2">
                    <p className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">Daily Beat Assignments</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(confirmedBooking.beat_allocations).map(([dayIdx, beat]) => {
                        const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Number(dayIdx)] || `Day ${dayIdx}`
                        return (
                          <div key={dayIdx} className="bg-white/50 dark:bg-black/20 p-2 rounded-lg text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{dayName}: </span>
                            <span className="text-teal-700 dark:text-teal-400 font-bold">{beat}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-center pt-2">
                <button
                  onClick={() => downloadReceiptPdf(confirmedBooking)}
                  className="neu-btn neu-btn-primary px-5 py-2.5 flex items-center gap-2 text-sm font-semibold"
                >
                  <Download size={16} />
                  Download PDF Receipt
                </button>

                <button
                  onClick={() => window.print()}
                  className="neu-btn neu-btn-ghost px-5 py-2.5 flex items-center gap-2 text-sm"
                >
                  <Printer size={16} />
                  Print
                </button>

                <button
                  onClick={() => {
                    setConfirmedBooking(null)
                    setActiveTab('overview')
                  }}
                  className="neu-btn neu-btn-ghost px-5 py-2.5 text-sm"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MY BOOKING LOOKUP */}
        {activeTab === 'lookup' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="neu-raised rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Find & Manage Your Booking
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enter your email address, phone number, or booking reference to view your confirmed fishing schedule.
                </p>
              </div>

              {/* Search Form */}
              <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    placeholder="Enter your email, phone, or booking ID..."
                    className="neu-form-input w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="neu-btn neu-btn-primary px-6 py-3 font-semibold flex items-center justify-center gap-2 text-sm"
                >
                  <Search size={16} />
                  Lookup
                </button>
              </form>

              {/* Lookup Results */}
              {lookupSearched && (
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    {lookupResults && lookupResults.length > 0
                      ? `Found ${lookupResults.length} Booking(s)`
                      : 'No bookings found with that information.'}
                  </h4>

                  {lookupResults && lookupResults.length > 0 && (
                    <div className="space-y-4">
                      {lookupResults.map((b) => (
                        <div key={b.id} className="neu-inset rounded-2xl p-5 space-y-4">
                          <div className="flex flex-wrap justify-between items-start gap-2">
                            <div>
                              <div className="font-bold text-base text-slate-800 dark:text-slate-100">
                                Week {b.week} · {b.days_count} Days ({b.booking_type === 'consecutive' ? 'Consecutive' : 'Flexible'})
                              </div>
                              <div className="text-xs text-slate-500">
                                Guest: {b.name} · Ref: {b.id}
                              </div>
                            </div>
                            <button
                              onClick={() => downloadReceiptPdf(b)}
                              className="neu-btn neu-btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
                            >
                              <Download size={14} />
                              Download PDF
                            </button>
                          </div>

                          {/* Beat Allocation Chips */}
                          {b.beat_allocations && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
                              {Object.entries(b.beat_allocations).map(([dayIdx, beat]) => {
                                const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Number(dayIdx)] || `Day ${dayIdx}`
                                return (
                                  <div key={dayIdx} className="bg-white/60 dark:bg-black/30 p-2 rounded-xl text-center text-xs">
                                    <div className="font-bold text-slate-500 text-[10px] uppercase">{dayName}</div>
                                    <div className="font-semibold text-teal-600 dark:text-teal-400 mt-0.5">{beat}</div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {lookupResults && lookupResults.length === 0 && (
                    <div className="p-6 text-center text-sm text-slate-500">
                      We could not find any active bookings under "{lookupEmail}".
                      Please verify your spelling or contact the fishery manager.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="mt-16 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
        <p>© {new Date().getFullYear()} River & Loch Angling · Scottish Salmon & Trout Booking System</p>
        <p className="flex items-center justify-center gap-2">
          <span>Fishery Rules & Safety</span>
          <span>·</span>
          <span>Catch & Release Policy</span>
          <span>·</span>
          <button
            onClick={onSwitchToAdmin}
            className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
          >
            Management Login
          </button>
        </p>
      </footer>
    </div>
  )
}
