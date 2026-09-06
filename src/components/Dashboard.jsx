import { useState, useEffect } from 'react'
import { Users, Calendar, CheckCircle, Trash2, Edit2, Settings, Pencil, Search } from 'lucide-react'
import { getWeeksInSession, getTotalSlots, getBookedSlots, formatDateFull, BEATS } from '../utils/dateHelpers'

const DASHBOARD_PAGE_SIZE = 5

function Dashboard({ bookings, sessionStart, sessionEnd, onDeleteBooking, onEditBooking, onUpdateSession }) {
  const weeks = getWeeksInSession(sessionStart, sessionEnd)
  const totalSlots = getTotalSlots(weeks)
  const bookedSlots = getBookedSlots(bookings)
  const availableSlots = totalSlots - bookedSlots

  const [isEditingSession, setIsEditingSession] = useState(false)
  const [editedStartDate, setEditedStartDate] = useState(sessionStart)
  const [editedEndDate, setEditedEndDate] = useState(sessionEnd)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sessionError, setSessionError] = useState('')

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const filteredBookings = bookings.filter((booking) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      (booking.name && booking.name.toLowerCase().includes(query)) ||
      (booking.email && booking.email.toLowerCase().includes(query)) ||
      (booking.phone && booking.phone.toLowerCase().includes(query))
    )
  })

  // Pagination
  const allFilteredBookings = filteredBookings
  const totalPages = Math.ceil(allFilteredBookings.length / DASHBOARD_PAGE_SIZE)
  const displayedBookings = allFilteredBookings.slice((currentPage - 1) * DASHBOARD_PAGE_SIZE, currentPage * DASHBOARD_PAGE_SIZE)

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  const getBeatUsage = () => {
    const usage = {}
    BEATS.forEach(beat => { usage[beat] = 0 })
    bookings.forEach(booking => {
      if (booking.beat_allocations) {
        Object.values(booking.beat_allocations).forEach(beat => {
          if (usage[beat] !== undefined) usage[beat]++
        })
      } else if (booking.beat) {
        usage[booking.beat] = (usage[booking.beat] || 0) + (booking.specificDays?.length || 0)
      }
    })
    return usage
  }

  const beatUsage = getBeatUsage()

  const getBookingDaysDescription = (booking) => {
    if (booking.beat_allocations) {
      const days = Object.keys(booking.beat_allocations).length
      return `${days} ${days === 1 ? 'day' : 'days'}`
    }
    return `${booking.days_count} ${booking.days_count === 1 ? 'day' : 'days'}`
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
        setSessionError('End date must be after start date')
      }
    }
  }

  const handleCancelEdit = () => {
    setEditedStartDate(sessionStart)
    setEditedEndDate(sessionEnd)
    setIsEditingSession(false)
    setSessionError('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* ========== SEASON CONFIGURATION ========== */}
      <div className="neu-section animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 className="neu-section-title">
            <Settings size={18} />
            Season Configuration
          </h2>
          {!isEditingSession && (
            <button onClick={() => setIsEditingSession(true)} className="neu-btn neu-btn-ghost neu-btn-sm">
              <Edit2 size={14} />
              Edit Season
            </button>
          )}
        </div>

        {isEditingSession ? (
          <div className="neu-raised" style={{ padding: '28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="neu-form-group" style={{ marginBottom: 0 }}>
                <label className="neu-form-label">Start Date</label>
                <input
                  type="date"
                  value={editedStartDate}
                  onChange={(e) => setEditedStartDate(e.target.value)}
                  className="neu-form-input"
                />
              </div>
              <div className="neu-form-group" style={{ marginBottom: 0 }}>
                <label className="neu-form-label">End Date</label>
                <input
                  type="date"
                  value={editedEndDate}
                  onChange={(e) => setEditedEndDate(e.target.value)}
                  className="neu-form-input"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleSaveSession} className="neu-btn neu-btn-success">
                Save Changes
              </button>
              <button onClick={handleCancelEdit} className="neu-btn neu-btn-ghost">
                Cancel
              </button>
            </div>
            {sessionError && (
              <p style={{ fontSize: '0.8rem', color: '#c53030', background: 'rgba(253, 224, 210, 0.15)', padding: '12px', borderRadius: '12px', marginTop: '16px' }}>
                ❌ {sessionError}
              </p>
            )}
            <p style={{ fontSize: '0.8rem', color: '#b7791f', background: 'rgba(252, 211, 77, 0.15)', padding: '12px', borderRadius: '12px', marginTop: '16px' }}>
              ⚠️ Changing season dates may affect existing bookings. Week numbers will be recalculated.
            </p>
          </div>
        ) : (
          <div className="config-pills">
            <div className="config-pill">
              <div className="config-pill-label">Season Start</div>
              <div className="config-pill-value">
                {new Date(sessionStart).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div className="config-pill">
              <div className="config-pill-label">Season End</div>
              <div className="config-pill-value">
                {new Date(sessionEnd).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div className="config-pill">
              <div className="config-pill-label">Duration</div>
              <div className="config-pill-value">
                {Math.ceil((new Date(sessionEnd) - new Date(sessionStart)) / (1000 * 60 * 60 * 24))} days
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '6px' }}>
                  ({weeks.length} weeks)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== KPI CARDS ========== */}
      <div className="kpi-grid">
        <div className="kpi-card blue animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div className="kpi-icon blue">
            <Users size={22} />
          </div>
          <div className="kpi-number">{bookings.length}</div>
          <div className="kpi-label">Total Bookings</div>
        </div>

        <div className="kpi-card green animate-fade-in" style={{ animationDelay: '80ms' }}>
          <div className="kpi-icon green">
            <CheckCircle size={22} />
          </div>
          <div className="kpi-number">{availableSlots}</div>
          <div className="kpi-label">Available Slots</div>
        </div>

        <div className="kpi-card orange animate-fade-in" style={{ animationDelay: '160ms' }}>
          <div className="kpi-icon orange">
            <Calendar size={22} />
          </div>
          <div className="kpi-number">{bookedSlots}</div>
          <div className="kpi-label">Booked Slots</div>
        </div>

        <div className="kpi-card purple animate-fade-in" style={{ animationDelay: '240ms' }}>
          <div className="kpi-icon purple">
            <Calendar size={22} />
          </div>
          <div className="kpi-number">{weeks.length}</div>
          <div className="kpi-label">Total Weeks</div>
          <div className="kpi-sublabel">Mon–Sat · 6 days/week</div>
        </div>
      </div>

      {/* ========== BEAT & LOCH USAGE ========== */}
      <div className="neu-section animate-fade-in">
        <h2 className="neu-section-title">Beat & Loch Usage</h2>
        <div className="beat-grid">
          {BEATS.map((beat, index) => (
            <div key={beat} className="beat-card animate-scale-in" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="beat-card-name">{beat}</div>
              <div className="beat-card-count">{beatUsage[beat]}</div>
              <div className="beat-card-label">bookings</div>
            </div>
          ))}
        </div>
      </div>

      {/* ========== RECENT BOOKINGS TABLE ========== */}
      <div className="neu-table-wrapper animate-fade-in">
        <div className="neu-table-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                {searchQuery ? 'Search Results' : 'Recent Bookings'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {searchQuery
                  ? `${filteredBookings.length} of ${bookings.length} bookings`
                  : `Showing ${displayedBookings.length} of ${bookings.length} bookings`
                }
              </p>
            </div>
          </div>

          {/* Neumorphic Search Bar */}
          <div className="neu-search-bar">
            <Search className="neu-search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neu-search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="neu-search-clear">
                ✕
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="neu-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Week</th>
                <th>Days</th>
                <th>Type</th>
                <th>Beat/Loch</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedBookings.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="neu-empty">
                      <div className="neu-empty-icon">🎣</div>
                      <p style={{ fontWeight: 600 }}>
                        {searchQuery ? 'No bookings match your search' : 'No bookings yet'}
                      </p>
                      <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                        {searchQuery ? 'Try a different search term' : 'Click "New Booking" to add one'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedBookings.map((booking, index) => {
                  const week = weeks[booking.week - 1]
                  return (
                    <tr key={booking.id} className="animate-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{booking.name}</div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{booking.email || '-'}</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{booking.phone}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>Week {booking.week}</div>
                        {week && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '2px' }}>
                            {formatDateFull(week.startDate)} – {formatDateFull(week.endDate)}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-blue">{getBookingDaysDescription(booking)}</span>
                      </td>
                      <td>
                        <span className={`badge ${booking.booking_type === 'consecutive' ? 'badge-purple' : 'badge-pink'}`}>
                          {booking.booking_type === 'consecutive' ? 'Auto' : 'Flexible'}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-green">{getBookingBeatsDescription(booking)}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => onEditBooking(booking)} className="neu-btn neu-btn-ghost neu-btn-sm" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => onDeleteBooking(booking.id)} className="neu-btn neu-btn-danger neu-btn-sm" title="Delete">
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

        {displayedBookings.length > 0 && (
          <div className="neu-table-footer">
            <span>Total: {allFilteredBookings.length} bookings</span>
            <span style={{ display: 'flex', gap: '16px' }}>
              <span>Auto: {allFilteredBookings.filter(b => b.booking_type === 'consecutive').length}</span>
              <span>Flexible: {allFilteredBookings.filter(b => b.booking_type === 'flexible').length}</span>
            </span>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="neu-pagination">
            <button
              className="neu-page-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ← Prev
            </button>
            <div className="neu-page-info">
              Page {currentPage} of {totalPages}
            </div>
            <button
              className="neu-page-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
