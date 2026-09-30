import { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Calendar,
  CheckCircle,
  Trash2,
  Edit2,
  Settings,
  Pencil,
  Search,
  Plus,
  Download,
  Sparkles,
  TrendingUp,
  MapPin,
  Clock,
  ShieldCheck
} from 'lucide-react'
import { getWeeksInSession, getTotalSlots, getBookedSlots, formatDateFull, formatDate, BEATS } from '../utils/dateHelpers'
import WeatherWidget from './WeatherWidget'
import jsPDF from 'jspdf'

const DASHBOARD_PAGE_SIZE = 6

function Dashboard({
  bookings = [],
  sessionStart,
  sessionEnd,
  onDeleteBooking,
  onEditBooking,
  onUpdateSession,
  activeSession,
  onNewBooking
}) {
  const weeks = useMemo(() => getWeeksInSession(sessionStart, sessionEnd), [sessionStart, sessionEnd])
  const totalSlots = getTotalSlots(weeks)
  const bookedSlots = getBookedSlots(bookings)
  const availableSlots = Math.max(0, totalSlots - bookedSlots)
  const occupancyRate = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0

  const [isEditingSession, setIsEditingSession] = useState(false)
  const [editedStartDate, setEditedStartDate] = useState(sessionStart)
  const [editedEndDate, setEditedEndDate] = useState(sessionEnd)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sessionError, setSessionError] = useState('')

  // Sync state if props change
  useEffect(() => {
    setEditedStartDate(sessionStart)
    setEditedEndDate(sessionEnd)
  }, [sessionStart, sessionEnd])

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const filteredBookings = useMemo(() => {
    if (!searchQuery) return bookings
    const query = searchQuery.toLowerCase().trim()
    const cleanNum = query.replace(/^(bk-|#)/i, '')
    return bookings.filter((b) => {
      const refMatch = b.booking_ref && b.booking_ref.toLowerCase().includes(query)
      const nameMatch = b.name && b.name.toLowerCase().includes(query)
      const emailMatch = b.email && b.email.toLowerCase().includes(query)
      const phoneMatch = b.phone && b.phone.toLowerCase().includes(query)
      const idMatch = String(b.id || '') === cleanNum || String(b.id || '').includes(cleanNum)
      const formattedId = b.id ? `bk-${String(b.id).padStart(5, '0')}` : ''
      const formattedMatch = formattedId.includes(query) || formattedId.includes(cleanNum)

      return refMatch || nameMatch || emailMatch || phoneMatch || idMatch || formattedMatch
    })
  }, [bookings, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / DASHBOARD_PAGE_SIZE) || 1
  const displayedBookings = filteredBookings.slice(
    (currentPage - 1) * DASHBOARD_PAGE_SIZE,
    currentPage * DASHBOARD_PAGE_SIZE
  )

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  // Calculate beat usage statistics
  const beatUsage = useMemo(() => {
    const usage = {}
    BEATS.forEach((beat) => { usage[beat] = 0 })
    bookings.forEach((booking) => {
      if (booking.beat_allocations) {
        Object.values(booking.beat_allocations).forEach((beat) => {
          if (usage[beat] !== undefined) usage[beat]++
        })
      } else if (booking.beat) {
        usage[booking.beat] = (usage[booking.beat] || 0) + (booking.specificDays?.length || 1)
      }
    })
    return usage
  }, [bookings])

  const getBookingDaysDescription = (booking) => {
    if (booking.beat_allocations) {
      const days = Object.keys(booking.beat_allocations).length
      return `${days} ${days === 1 ? 'day' : 'days'}`
    }
    return `${booking.days_count || 1} ${booking.days_count === 1 ? 'day' : 'days'}`
  }

  const getBookingBeatsDescription = (booking) => {
    if (booking.beat_allocations) {
      const beats = [...new Set(Object.values(booking.beat_allocations))]
      if (beats.length === 1) return beats[0]
      return `${beats.length} beats`
    }
    return booking.beat || 'N/A'
  }

  const handleSaveSession = () => {
    if (editedStartDate && editedEndDate) {
      const start = new Date(editedStartDate)
      const end = new Date(editedEndDate)
      if (end > start) {
        onUpdateSession(editedStartDate, editedEndDate)
        setIsEditingSession(false)
        setSessionError('')
      } else {
        setSessionError('End date must be strictly after start date')
      }
    } else {
      setSessionError('Please select both start and end dates')
    }
  }

  const handleCancelEdit = () => {
    setEditedStartDate(sessionStart)
    setEditedEndDate(sessionEnd)
    setIsEditingSession(false)
    setSessionError('')
  }

  // Export Individual Booking PDF Pass
  const handleDownloadPdf = (booking) => {
    try {
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.setTextColor(5, 150, 105)
      doc.text('Fishing Rod Permit & Confirmation', 14, 22)

      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Booking Ref: ${booking.booking_ref || (booking.id ? 'BK-' + String(booking.id).padStart(5, '0') : 'BK-00001')}`, 14, 30)
      doc.text(`Date Issued: ${new Date().toLocaleDateString('en-GB')}`, 14, 36)

      doc.setDrawColor(200)
      doc.line(14, 40, 196, 40)

      doc.setFontSize(12)
      doc.setTextColor(30)
      doc.text(`Guest: ${booking.name}`, 14, 50)
      doc.text(`Email: ${booking.email || 'N/A'}`, 14, 58)
      doc.text(`Phone: ${booking.phone || 'N/A'}`, 14, 66)
      doc.text(`Week Number: Week ${booking.week}`, 14, 74)
      doc.text(`Days Booked: ${booking.days_count || 1} day(s)`, 14, 82)
      doc.text(`Booking Mode: ${booking.booking_type === 'consecutive' ? 'Consecutive Fair Rotation' : 'Flexible Selection'}`, 14, 90)

      doc.line(14, 98, 196, 98)
      doc.setFontSize(14)
      doc.text('Daily Beat Allocations', 14, 108)

      let y = 118
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      if (booking.beat_allocations) {
        Object.entries(booking.beat_allocations).forEach(([dayIdx, beat]) => {
          const dName = dayNames[Number(dayIdx)] || `Day ${Number(dayIdx) + 1}`
          doc.setFontSize(10)
          doc.text(`${dName}:`, 20, y)
          doc.text(`${beat}`, 80, y)
          y += 7
        })
      }

      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.text('Anglers must observe local catch & release bylaws and carry a valid photo ID.', 14, y + 15)

      doc.save(`Permit-Week-${booking.week}-${booking.name.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
    }
  }

  // Export Full CSV of Bookings
  const handleExportAllCsv = () => {
    if (!bookings.length) return
    const headers = ['Ref', 'Name', 'Email', 'Phone', 'Week', 'Days', 'Type', 'Beats']
    const rows = bookings.map((b) => [
      b.booking_ref || b.id,
      `"${b.name || ''}"`,
      b.email || '',
      `"${b.phone || ''}"`,
      b.week,
      b.days_count,
      b.booking_type,
      `"${b.beat_allocations ? Object.values(b.beat_allocations).join('; ') : b.beat || ''}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Fishing_Bookings_${activeSession?.name || 'Season'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ========== TOP BANNER & QUICK STATS ========== */}
      <div className="neu-raised rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={16} />
            <span>{activeSession?.name || 'Active Fishery Season'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Fishery Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Live overview of rod capacities, daily beat allocations, and visitor rosters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={handleExportAllCsv}
            className="neu-btn neu-btn-ghost px-4 py-2.5 flex items-center gap-2 text-xs font-semibold"
            title="Download full CSV roster"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          {!isEditingSession && (
            <button
              onClick={() => setIsEditingSession(true)}
              className="neu-btn neu-btn-ghost px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              <Settings size={15} />
              <span>Edit Season</span>
            </button>
          )}
        </div>
      </div>

      {/* ========== LIVE WEATHER & HIGHLAND RIVER GAUGE ========== */}
      <WeatherWidget
        sessionName={activeSession?.name || 'Sutherland Highland Fishery'}
      />

      {/* ========== KPI STATS GRID ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bookings */}
        <div className="neu-flat p-5 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Bookings</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
            {bookings.length}
          </div>
          <div className="text-[11px] text-slate-400">
            {bookings.filter(b => b.booking_type === 'consecutive').length} Consecutive · {bookings.filter(b => b.booking_type === 'flexible').length} Flexible
          </div>
        </div>

        {/* Booked Slots */}
        <div className="neu-flat p-5 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Booked Rod Slots</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Calendar size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
            {bookedSlots}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            {occupancyRate}% Season Capacity
          </div>
        </div>

        {/* Available Slots */}
        <div className="neu-flat p-5 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Available Rods</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {availableSlots}
          </div>
          <div className="text-[11px] text-slate-400">
            of {totalSlots} total rod slots
          </div>
        </div>

        {/* Season Weeks */}
        <div className="neu-flat p-5 rounded-2xl space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Weeks</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
            {weeks.length}
          </div>
          <div className="text-[11px] text-slate-400">
            6 Days/Week (Mon–Sat)
          </div>
        </div>
      </div>

      {/* ========== SEASON CONFIGURATION DRAWER ========== */}
      {isEditingSession && (
        <div className="neu-raised rounded-3xl p-6 sm:p-8 space-y-4 border border-emerald-500/30 animate-slide-up">
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Settings size={18} className="text-emerald-600" />
              Modify Season Dates
            </h3>
            <span className="text-xs text-slate-400">Active Season: {activeSession?.name}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Season Start Date</label>
              <input
                type="date"
                value={editedStartDate}
                onChange={(e) => setEditedStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Season End Date</label>
              <input
                type="date"
                value={editedEndDate}
                onChange={(e) => setEditedEndDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
              />
            </div>
          </div>

          {sessionError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200">
              ⚠️ {sessionError}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSaveSession}
              className="neu-btn neu-btn-primary px-5 py-2.5 text-xs font-bold"
            >
              Save Changes
            </button>
            <button
              onClick={handleCancelEdit}
              className="neu-btn neu-btn-ghost px-4 py-2.5 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ========== BEAT & LOCH UTILIZATION CARDS ========== */}
      <div className="neu-raised rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex justify-between items-center border-b pb-3 border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
              Beat & Loch Rod Utilization
            </h3>
            <p className="text-xs text-slate-400">Total angler rod-days assigned across water sections</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {BEATS.map((beat) => {
            const count = beatUsage[beat] || 0
            return (
              <div key={beat} className="neu-inset p-4 rounded-2xl text-center space-y-1">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{beat}</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {count}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">rod days</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ========== RECENT BOOKINGS TABLE ========== */}
      <div className="neu-raised rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
              Recent Angler Bookings
            </h3>
            <p className="text-xs text-slate-400">
              {searchQuery
                ? `Showing ${filteredBookings.length} matching reservations`
                : `Showing ${displayedBookings.length} of ${bookings.length} reservations`}
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID (e.g. BK-00001 or 12), Name, Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl neu-inset p-2">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-3 px-3">Ref</th>
                <th className="py-3 px-3">Angler Name</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Week</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Beats</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {displayedBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <div className="text-2xl mb-1">🎣</div>
                    <div className="font-semibold text-sm">
                      {searchQuery ? 'No matching bookings found' : 'No bookings recorded in this season'}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedBookings.map((b) => {
                  const week = weeks[b.week - 1]
                  return (
                    <tr key={b.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {b.booking_ref || (b.id ? 'BK-' + String(b.id).padStart(5, '0') : '-')}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {b.name}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-700 dark:text-slate-300">{b.email || '-'}</div>
                        <div className="text-[10px] text-slate-400">{b.phone}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold">Week {b.week}</span>
                        {week && (
                          <div className="text-[10px] text-slate-400">
                            {formatDate(week.startDate)} – {formatDate(week.endDate)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          {getBookingDaysDescription(b)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {getBookingBeatsDescription(b)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleDownloadPdf(b)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                            title="Download PDF Permit"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            onClick={() => onEditBooking(b)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                            title="Edit Booking"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => onDeleteBooking(b.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Booking"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-2 text-xs">
            <span className="text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
