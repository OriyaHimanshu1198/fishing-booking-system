import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, Calendar, User, Phone, Mail, ChevronDown, ChevronUp, X, Download } from 'lucide-react'
import { BEATS, formatDateFull } from '../utils/dateHelpers'
import jsPDF from 'jspdf'

const ITEMS_PER_PAGE = 10

function ViewBookings({ bookings, sessions, onDeleteBooking, onEditBooking }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSession, setSelectedSession] = useState('all')
  const [selectedWeek, setSelectedWeek] = useState('all')
  const [selectedBeat, setSelectedBeat] = useState('all')
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [expandedBooking, setExpandedBooking] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedSession, selectedWeek, selectedBeat])

  // Get unique weeks from bookings
  const uniqueWeeks = useMemo(() => {
    const weeks = [...new Set(bookings.map(b => b.week))].sort((a, b) => a - b)
    return weeks
  }, [bookings])

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(b =>
        b.name?.toLowerCase().includes(query) ||
        b.email?.toLowerCase().includes(query) ||
        b.phone?.toLowerCase().includes(query)
      )
    }

    if (selectedSession !== 'all') {
      result = result.filter(b => b.session_id === selectedSession)
    }

    if (selectedWeek !== 'all') {
      result = result.filter(b => b.week === Number(selectedWeek))
    }

    if (selectedBeat !== 'all') {
      result = result.filter(b => {
        if (b.beat_allocations) {
          return Object.values(b.beat_allocations).includes(selectedBeat)
        }
        return false
      })
    }

    result.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (sortField === 'created_at') {
        aVal = new Date(aVal || 0)
        bVal = new Date(bVal || 0)
      }

      if (sortField === 'week') {
        aVal = Number(aVal || 0)
        bVal = Number(bVal || 0)
      }

      if (sortField === 'name') {
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
    const session = sessions?.find(s => s.id === sessionId)
    return session?.name || 'Unknown Session'
  }

  const getBeatDescription = (booking) => {
    if (booking.beat_allocations) {
      const beats = [...new Set(Object.values(booking.beat_allocations))]
      if (beats.length === 1) return beats[0]
      return beats.join(', ')
    }
    return booking.beat || 'N/A'
  }

  const getDaysDescription = (booking) => {
    if (booking.beat_allocations) {
      return Object.keys(booking.beat_allocations).length
    }
    return booking.days_count || 0
  }

  const generateBookingPdf = (booking) => {
    const doc = new jsPDF();
    const sessionName = getSessionName(booking.session_id);

    // Set up the PDF
    doc.setFontSize(20);
    doc.text('Booking Confirmation', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Name: ${booking.name || 'N/A'}`, 20, 30);
    doc.text(`Email: ${booking.email || 'N/A'}`, 20, 40);
    doc.text(`Phone: ${booking.phone || 'N/A'}`, 20, 50);
    doc.text(`Week: ${booking.week}`, 20, 60);
    doc.text(`Days: ${getDaysDescription(booking)}`, 20, 70);
    doc.text(`Type: ${booking.booking_type === 'consecutive' ? 'Auto' : 'Flexible'}`, 20, 80);
    doc.text(`Beat/Loch: ${getBeatDescription(booking)}`, 20, 90);
    doc.text(`Season: ${sessionName}`, 20, 100);
    doc.text(`Booked On: ${booking.created_at ? new Date(booking.created_at).toLocaleDateString() : 'N/A'}`, 20, 110);

    // Save the PDF
    doc.save(`booking-${booking.id || new Date().getTime()}.pdf`);
  };

  const handlePdfExport = (booking) => {
    generateBookingPdf(booking);
  };

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedSession('all')
    setSelectedWeek('all')
    setSelectedBeat('all')
  }

  const hasActiveFilters = searchQuery || selectedSession !== 'all' || selectedWeek !== 'all' || selectedBeat !== 'all'

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  const activeFilterCount = [searchQuery, selectedSession !== 'all', selectedWeek !== 'all', selectedBeat !== 'all'].filter(Boolean).length

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)
  const paginatedBookings = filteredBookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  const handleCsvExport = () => {
    const headers = ['Name', 'Email', 'Phone', 'Week', 'Days', 'Type', 'Beat/Loch', 'Season', 'Booked On']
    const rows = filteredBookings.map((b) => [
      b.name || '',
      b.email || '',
      b.phone || '',
      `Week ${b.week}`,
      getDaysDescription(b),
      b.booking_type === 'consecutive' ? 'Auto' : 'Flexible',
      getBeatDescription(b),
      getSessionName(b.session_id),
      b.created_at ? new Date(b.created_at).toLocaleDateString() : '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `bookings-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header + Search */}
      <div className="neu-table-wrapper animate-fade-in">
        <div className="neu-table-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                All Bookings
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {filteredBookings.length} of {bookings.length} bookings
                {hasActiveFilters && ' (filtered)'}
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`neu-btn ${showFilters ? 'neu-btn-primary' : 'neu-btn-ghost'}`}
              style={{ fontSize: '0.8rem' }}
            >
              <Filter size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span style={{
                  background: 'var(--accent-teal)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '4px',
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            {filteredBookings.length > 0 && (
              <button
                onClick={handleCsvExport}
                className="neu-btn neu-btn-ghost"
                style={{ fontSize: '0.8rem' }}
                title="Export to CSV"
              >
                <Download size={16} />
                Export CSV
              </button>
            )}
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

        {/* Filter Options */}
        {showFilters && (
          <div className="neu-section animate-fade-in" style={{ margin: '0 24px 24px', borderRadius: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {/* Session Filter */}
              <div className="neu-form-group" style={{ marginBottom: 0 }}>
                <label className="neu-form-label">Season</label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="neu-form-input"
                >
                  <option value="all">All Seasons</option>
                  {sessions?.map(session => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Week Filter */}
              <div className="neu-form-group" style={{ marginBottom: 0 }}>
                <label className="neu-form-label">Week</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="neu-form-input"
                >
                  <option value="all">All Weeks</option>
                  {uniqueWeeks.map(week => (
                    <option key={week} value={week}>Week {week}</option>
                  ))}
                </select>
              </div>

              {/* Beat Filter */}
              <div className="neu-form-group" style={{ marginBottom: 0 }}>
                <label className="neu-form-label">Beat/Loch</label>
                <select
                  value={selectedBeat}
                  onChange={(e) => setSelectedBeat(e.target.value)}
                  className="neu-form-input"
                >
                  <option value="all">All Beats</option>
                  {BEATS.map(beat => (
                    <option key={beat} value={beat}>{beat}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="neu-btn neu-btn-danger"
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <X size={14} />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bookings Table */}
      <div className="neu-table-wrapper animate-fade-in">
        <div style={{ overflowX: 'auto' }}>
          <table className="neu-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Name
                    <SortIcon field="name" />
                  </div>
                </th>
                <th>Contact</th>
                <th
                  onClick={() => handleSort('week')}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Week
                    <SortIcon field="week" />
                  </div>
                </th>
                <th>Days</th>
                <th>Type</th>
                <th>Beat/Loch</th>
                <th>Season</th>
                <th
                  onClick={() => handleSort('created_at')}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Booked On
                    <SortIcon field="created_at" />
                  </div>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="neu-empty">
                      <div className="neu-empty-icon">🎣</div>
                      <p style={{ fontWeight: 600 }}>
                        {hasActiveFilters ? 'No bookings match your filters' : 'No bookings yet'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          style={{
                            marginTop: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'var(--accent-teal)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Clear filters to see all bookings
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((booking, index) => (
                  <tr key={booking.id} className="animate-fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => toggleExpand(booking.id)}
                          className="neu-btn neu-btn-ghost"
                          style={{ padding: '4px', minWidth: 'auto' }}
                        >
                          {expandedBooking === booking.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{booking.name}</div>
                          {expandedBooking === booking.id && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-light)', marginTop: '2px' }}>
                              ID: {booking.id}
                            </div>
                          )}
                          {expandedBooking === booking.id && (
                            <div style={{ marginTop: '8px' }}>
                              <button
                                onClick={() => handlePdfExport(booking)}
                                className="neu-btn neu-btn-primary"
                                style={{
                                  width: '100%',
                                  fontSize: '0.75rem',
                                  padding: '6px 12px'
                                }}
                              >
                                <Printer size={16} />
                                Download PDF
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>{booking.email || '-'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{booking.phone}</div>
                    </td>
                    <td>
                      <span className="badge badge-blue">Week {booking.week}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>{getDaysDescription(booking)} days</span>
                    </td>
                    <td>
                      <span className={`badge ${booking.booking_type === 'consecutive' ? 'badge-purple' : 'badge-pink'}`}>
                        {booking.booking_type === 'consecutive' ? 'Auto' : 'Flexible'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-green">{getBeatDescription(booking)}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {getSessionName(booking.session_id)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {booking.created_at ? new Date(booking.created_at).toLocaleDateString() : '-'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => onEditBooking(booking)}
                          className="neu-btn neu-btn-ghost neu-btn-sm"
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteBooking(booking.id)}
                          className="neu-btn neu-btn-danger neu-btn-sm"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Stats */}
        {filteredBookings.length > 0 && (
          <div className="neu-table-footer">
            <span>Total: {filteredBookings.length} bookings</span>
            <span style={{ display: 'flex', gap: '16px' }}>
              <span>Auto: {filteredBookings.filter(b => b.booking_type === 'consecutive').length}</span>
              <span>Flexible: {filteredBookings.filter(b => b.booking_type === 'flexible').length}</span>
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

export default ViewBookings
