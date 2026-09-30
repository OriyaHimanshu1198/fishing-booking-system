import { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Download,
  Calendar,
  Sparkles,
  MapPin,
  Pencil,
  Trash2,
  Users,
  FileSpreadsheet
} from 'lucide-react'
import { BEATS, formatDate } from '../utils/dateHelpers'
import jsPDF from 'jspdf'

const ITEMS_PER_PAGE = 10

function ViewBookings({ bookings = [], sessions = [], onDeleteBooking, onEditBooking }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBookingId, setFilterBookingId] = useState('')
  const [selectedSession, setSelectedSession] = useState('all')
  const [selectedWeek, setSelectedWeek] = useState('all')
  const [selectedBeat, setSelectedBeat] = useState('all')
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [expandedBooking, setExpandedBooking] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterBookingId, selectedSession, selectedWeek, selectedBeat])

  // Unique weeks available in the dataset
  const uniqueWeeks = useMemo(() => {
    const weeks = [...new Set(bookings.map((b) => b.week))].filter(Boolean).sort((a, b) => a - b)
    return weeks
  }, [bookings])

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings]

    if (filterBookingId.trim()) {
      const targetId = filterBookingId.toLowerCase().trim().replace(/^(bk-|#)/i, '')
      result = result.filter((b) => {
        const refMatch = b.booking_ref && b.booking_ref.toLowerCase().includes(targetId)
        const idMatch = String(b.id || '').toLowerCase().includes(targetId)
        const formattedId = b.id ? `bk-${String(b.id).padStart(5, '0')}` : ''
        const formattedMatch = formattedId.includes(targetId)
        return refMatch || idMatch || formattedMatch
      })
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim()
      const cleanNum = query.replace(/^(bk-|#)/i, '')
      result = result.filter((b) => {
        const refMatch = b.booking_ref && b.booking_ref.toLowerCase().includes(query)
        const nameMatch = b.name && b.name.toLowerCase().includes(query)
        const emailMatch = b.email && b.email.toLowerCase().includes(query)
        const phoneMatch = b.phone && b.phone.toLowerCase().includes(query)
        const idMatch = String(b.id || '') === cleanNum || String(b.id || '').includes(cleanNum)
        const formattedId = b.id ? `bk-${String(b.id).padStart(5, '0')}` : ''
        const formattedMatch = formattedId.includes(query) || formattedId.includes(cleanNum)

        return refMatch || nameMatch || emailMatch || phoneMatch || idMatch || formattedMatch
      })
    }

    if (selectedSession !== 'all') {
      result = result.filter((b) => b.session_id === selectedSession)
    }

    if (selectedWeek !== 'all') {
      result = result.filter((b) => b.week === Number(selectedWeek))
    }

    if (selectedBeat !== 'all') {
      result = result.filter((b) => {
        if (b.beat_allocations) {
          return Object.values(b.beat_allocations).includes(selectedBeat)
        }
        return b.beat === selectedBeat
      })
    }

    result.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (sortField === 'created_at') {
        aVal = new Date(aVal || 0)
        bVal = new Date(bVal || 0)
      } else if (sortField === 'week') {
        aVal = Number(aVal || 0)
        bVal = Number(bVal || 0)
      } else if (sortField === 'name') {
        aVal = (aVal || '').toLowerCase()
        bVal = (bVal || '').toLowerCase()
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [bookings, searchQuery, selectedSession, selectedWeek, selectedBeat, sortField, sortDirection])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleExpand = (bookingId) => {
    setExpandedBooking(expandedBooking === bookingId ? null : bookingId)
  }

  const getSessionName = (sessionId) => {
    const session = sessions?.find((s) => s.id === sessionId)
    return session?.name || 'Active Season'
  }

  const getDaysDescription = (booking) => {
    if (booking.beat_allocations) {
      const days = Object.keys(booking.beat_allocations).length
      return `${days} ${days === 1 ? 'day' : 'days'}`
    }
    return `${booking.days_count || 1} ${booking.days_count === 1 ? 'day' : 'days'}`
  }

  const getBeatsSummary = (booking) => {
    if (booking.beat_allocations) {
      const unique = [...new Set(Object.values(booking.beat_allocations))]
      if (unique.length === 1) return unique[0]
      return `${unique.length} beats assigned`
    }
    return booking.beat || 'N/A'
  }

  // Generate High-Res PDF Pass
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
      doc.text(`Season: ${getSessionName(booking.session_id)}`, 14, 74)
      doc.text(`Week Number: Week ${booking.week}`, 14, 82)
      doc.text(`Days Booked: ${booking.days_count || 1} day(s)`, 14, 90)
      doc.text(`Booking Mode: ${booking.booking_type === 'consecutive' ? 'Consecutive Fair Rotation' : 'Flexible Selection'}`, 14, 98)

      doc.line(14, 106, 196, 106)
      doc.setFontSize(14)
      doc.text('Daily Beat Allocations', 14, 116)

      let y = 126
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
      doc.text('Anglers must observe local catch & release bylaws and carry a valid photo ID.', 14, y + 16)

      doc.save(`Permit-Week-${booking.week}-${booking.name.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
    }
  }

  // Export Filtered Bookings as CSV
  const handleCsvExport = () => {
    if (!filteredBookings.length) return
    const headers = ['Ref', 'Name', 'Email', 'Phone', 'Week', 'Days', 'Type', 'Season', 'Beat Allocations']
    const rows = filteredBookings.map((b) => [
      b.booking_ref || b.id,
      `"${b.name || ''}"`,
      b.email || '',
      `"${b.phone || ''}"`,
      b.week,
      b.days_count || 1,
      b.booking_type,
      `"${getSessionName(b.session_id)}"`,
      `"${b.beat_allocations ? Object.values(b.beat_allocations).join('; ') : b.beat || ''}"`
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Angler_Bookings_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterBookingId('')
    setSelectedSession('all')
    setSelectedWeek('all')
    setSelectedBeat('all')
  }

  const hasActiveFilters = searchQuery || filterBookingId || selectedSession !== 'all' || selectedWeek !== 'all' || selectedBeat !== 'all'
  const activeFilterCount = [searchQuery, filterBookingId, selectedSession !== 'all', selectedWeek !== 'all', selectedBeat !== 'all'].filter(Boolean).length

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE) || 1
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  const renderSortIcon = (field) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls Bar */}
      <div className="neu-raised rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              All Angler Bookings
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Showing {filteredBookings.length} of {bookings.length} reservations
              {hasActiveFilters && ' (filtered)'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`neu-btn px-4 py-2.5 flex items-center gap-1.5 text-xs font-semibold ${
                showFilters || activeFilterCount > 0 ? 'neu-btn-primary' : 'neu-btn-ghost'
              }`}
            >
              <Filter size={15} />
              <span>Filter Options</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filteredBookings.length > 0 && (
              <button
                onClick={handleCsvExport}
                className="neu-btn neu-btn-ghost px-4 py-2.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                title="Download CSV Spreadsheet"
              >
                <Download size={15} />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Booking ID (e.g. BK-00001 or #12), Guest Name, Email, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Expandable Filters Panel */}
        {showFilters && (
          <div className="p-4 rounded-2xl neu-inset grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4 animate-fade-in text-xs">
            {/* Direct Booking ID Filter */}
            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Booking ID / Ref
              </label>
              <input
                type="text"
                placeholder="e.g. BK-00001 or 12"
                value={filterBookingId}
                onChange={(e) => setFilterBookingId(e.target.value)}
                className="neu-form-input py-2 px-3 text-xs rounded-xl w-full"
              />
            </div>

            {/* Season Filter */}
            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Season
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="neu-form-input py-2 px-3 text-xs rounded-xl w-full"
              >
                <option value="all">All Seasons</option>
                {sessions?.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Week Filter */}
            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Week
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="neu-form-input py-2 px-3 text-xs rounded-xl w-full"
              >
                <option value="all">All Weeks</option>
                {uniqueWeeks.map((week) => (
                  <option key={week} value={week}>
                    Week {week}
                  </option>
                ))}
              </select>
            </div>

            {/* Beat Filter */}
            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Beat / Loch
              </label>
              <select
                value={selectedBeat}
                onChange={(e) => setSelectedBeat(e.target.value)}
                className="neu-form-input py-2 px-3 text-xs rounded-xl w-full"
              >
                <option value="all">All Beats & Loch</option>
                {BEATS.map((beat) => (
                  <option key={beat} value={beat}>
                    {beat}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <div className="sm:col-span-4 flex justify-end pt-2">
                <button
                  onClick={clearFilters}
                  className="neu-btn neu-btn-danger px-3 py-1.5 text-xs flex items-center gap-1"
                >
                  <X size={13} />
                  <span>Clear All Filters</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bookings Table */}
      <div className="neu-raised rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="overflow-x-auto rounded-2xl neu-inset p-2">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase tracking-wider text-slate-500">
                <th
                  onClick={() => handleSort('booking_ref')}
                  className="py-3 px-3 cursor-pointer select-none hover:text-emerald-600"
                >
                  <div className="flex items-center gap-1">
                    <span>Ref</span>
                    {renderSortIcon('booking_ref')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-3 cursor-pointer select-none hover:text-emerald-600"
                >
                  <div className="flex items-center gap-1">
                    <span>Angler Name</span>
                    {renderSortIcon('name')}
                  </div>
                </th>
                <th className="py-3 px-3">Contact</th>
                <th
                  onClick={() => handleSort('week')}
                  className="py-3 px-3 cursor-pointer select-none hover:text-emerald-600"
                >
                  <div className="flex items-center gap-1">
                    <span>Week</span>
                    {renderSortIcon('week')}
                  </div>
                </th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Season</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <div className="text-3xl mb-2">🎣</div>
                    <div className="font-semibold text-sm">
                      {hasActiveFilters ? 'No bookings match the selected filters' : 'No bookings recorded yet'}
                    </div>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                      >
                        Reset filters to view all bookings
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b) => {
                  const isExpanded = expandedBooking === b.id
                  return (
                    <tr key={b.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {b.booking_ref || (b.id ? 'BK-' + String(b.id).padStart(5, '0') : '-')}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleExpand(b.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title={isExpanded ? 'Collapse' : 'Expand daily beats'}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{b.name}</div>
                            {isExpanded && b.beat_allocations && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2.5 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] animate-fade-in">
                                {Object.entries(b.beat_allocations).map(([dayIdx, beat]) => {
                                  const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Number(dayIdx)] || `Day ${dayIdx}`
                                  return (
                                    <div key={dayIdx} className="bg-white/80 dark:bg-black/30 p-1.5 rounded-md">
                                      <span className="font-bold text-slate-500">{dayName}: </span>
                                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{beat}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-700 dark:text-slate-300">{b.email || '-'}</div>
                        <div className="text-[10px] text-slate-400">{b.phone}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Week {b.week}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          {getDaysDescription(b)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {getSessionName(b.session_id)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleDownloadPdf(b)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                            title="Download PDF Pass"
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

        {/* Footer Summary & Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800">
          <div>
            Total: <strong>{filteredBookings.length}</strong> bookings (
            {filteredBookings.filter((b) => b.booking_type === 'consecutive').length} Consecutive,{' '}
            {filteredBookings.filter((b) => b.booking_type === 'flexible').length} Flexible)
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
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
    </div>
  )
}

export default ViewBookings
