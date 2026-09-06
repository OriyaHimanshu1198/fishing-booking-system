import { useState } from 'react'
import { Printer } from 'lucide-react'
import { getWeeksInSession, BEATS, formatDate, getBeatForDay } from '../utils/dateHelpers'

// Color palette for bookings - each booking gets a unique color
const BOOKING_COLORS = [
  { bg: 'rgba(66, 153, 225, 0.12)', border: 'rgba(66, 153, 225, 0.35)', text: 'var(--accent-blue)', label: 'rgba(66, 153, 225, 0.18)' },
  { bg: 'rgba(72, 187, 120, 0.12)', border: 'rgba(72, 187, 120, 0.35)', text: 'var(--accent-green)', label: 'rgba(72, 187, 120, 0.18)' },
  { bg: 'rgba(237, 137, 54, 0.12)', border: 'rgba(237, 137, 54, 0.35)', text: 'var(--accent-orange)', label: 'rgba(237, 137, 54, 0.18)' },
  { bg: 'rgba(159, 122, 234, 0.12)', border: 'rgba(159, 122, 234, 0.35)', text: 'var(--accent-purple)', label: 'rgba(159, 122, 234, 0.18)' },
  { bg: 'rgba(245, 101, 101, 0.12)', border: 'rgba(245, 101, 101, 0.35)', text: 'var(--accent-red)', label: 'rgba(245, 101, 101, 0.18)' },
  { bg: 'rgba(56, 178, 172, 0.12)', border: 'rgba(56, 178, 172, 0.35)', text: 'var(--accent-teal)', label: 'rgba(56, 178, 172, 0.18)' },
]

const getBookingColor = (bookingId) => {
  const hash = String(bookingId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return BOOKING_COLORS[hash % BOOKING_COLORS.length]
}

function WeeklyView({ bookings, sessionStart, sessionEnd }) {
  const weeks = getWeeksInSession(sessionStart, sessionEnd)
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)

  const currentWeek = weeks[selectedWeekIndex]

  const getBookingsForSlot = (weekNumber, dayIndex, beat) => {
    return bookings.filter(
      b => b.week === weekNumber &&
           getBeatForDay(b, dayIndex) === beat
    )
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="print:space-y-2">

      {/* Week Selector */}
      <div className="neu-section print:hidden animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <h2 className="neu-section-title">
            <span style={{ fontSize: '1.15rem' }}>📅 Weekly View (Monday — Saturday)</span>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Select Week:</label>
            <select
              value={selectedWeekIndex}
              onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
              className="neu-form-input"
              style={{ minWidth: '260px' }}
            >
              {weeks.map((week, idx) => (
                <option key={week.weekNumber} value={idx}>
                  Week {week.weekNumber} ({formatDate(week.startDate)} - {formatDate(week.endDate)})
                </option>
              ))}
            </select>
            <button
              onClick={handlePrint}
              className="neu-btn neu-btn-success"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block" style={{ padding: '12px', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '12px', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
          Fishing Booking System — Weekly Schedule
        </h1>
        {currentWeek && (
          <div>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-dark)' }}>
              Week {currentWeek.weekNumber}: {formatDate(currentWeek.startDate)} — {formatDate(currentWeek.endDate)}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Season: {new Date(sessionStart).toLocaleDateString()} — {new Date(sessionEnd).toLocaleDateString()}
            </p>
          </div>
        )}
        <div style={{ borderTop: '2px solid var(--bg-inset)', marginTop: '10px' }}></div>
      </div>

      {/* Booking Grid */}
      {currentWeek && (
        <div className="neu-table-wrapper animate-fade-in" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="neu-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '140px' }} />
                {currentWeek.days.map((_, idx) => (
                  <col key={idx} style={{ width: `calc((100% - 140px) / 6)` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    background: 'var(--card-bg)',
                    textAlign: 'left',
                    padding: '14px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-dark)',
                    borderBottom: '2px solid var(--bg-inset)',
                    borderRight: '1px solid var(--bg-inset)',
                  }}>
                    Beat / Loch
                  </th>
                  {currentWeek.days.map((day, idx) => (
                    <th
                      key={idx}
                      style={{
                        padding: '14px 8px',
                        textAlign: 'center',
                        borderBottom: '2px solid var(--bg-inset)',
                        borderRight: '1px solid var(--bg-inset)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-dark)' }}>
                          {day.getDate()}
                        </span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {day.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BEATS.map((beat, beatIdx) => (
                  <tr key={beat} style={{ background: beatIdx % 2 === 0 ? 'var(--card-bg)' : 'var(--bg-inset)' }}>
                    <td style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      padding: '12px',
                      fontWeight: 700,
                      color: 'var(--text-dark)',
                      fontSize: '0.8rem',
                      borderBottom: '1px solid var(--bg-inset)',
                      borderRight: '1px solid var(--bg-inset)',
                      background: beatIdx % 2 === 0
                        ? 'linear-gradient(135deg, rgba(66, 153, 225, 0.06), rgba(66, 153, 225, 0.12))'
                        : 'linear-gradient(135deg, rgba(66, 153, 225, 0.03), rgba(66, 153, 225, 0.08))',
                      whiteSpace: 'nowrap',
                    }}>
                      {beat}
                    </td>
                    {currentWeek.days.map((day, dayIdx) => {
                      const bookingsInSlot = getBookingsForSlot(currentWeek.weekNumber, dayIdx, beat)
                      const booking = bookingsInSlot[0]
                      const colors = booking ? getBookingColor(booking.id) : null

                      return (
                        <td
                          key={dayIdx}
                          style={{
                            padding: '6px',
                            textAlign: 'center',
                            borderBottom: '1px solid var(--bg-inset)',
                            borderRight: '1px solid var(--bg-inset)',
                            background: booking ? colors.bg : 'transparent',
                          }}
                        >
                          {booking ? (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '8px 4px',
                              borderRadius: '10px',
                              background: colors.bg,
                              border: `1.5px solid ${colors.border}`,
                              overflow: 'hidden',
                            }}>
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: colors.text,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%',
                              }} title={booking.name}>
                                {booking.name}
                              </span>
                              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                {booking.phone}
                              </span>
                              <span style={{
                                fontSize: '0.55rem',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: colors.label,
                                color: colors.text,
                              }}>
                                {booking.booking_type === 'consecutive' ? 'Auto' : 'Manual'}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 500 }}>Free</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="neu-section print:hidden animate-fade-in">
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '14px' }}>Legend</h3>
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '5px', background: 'rgba(72, 187, 120, 0.12)', border: '1.5px solid rgba(72, 187, 120, 0.35)' }}></div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Booked</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '5px', background: 'var(--card-bg)', border: '1.5px solid var(--bg-inset)' }}></div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', background: 'rgba(72, 187, 120, 0.12)', color: 'var(--accent-green)' }}>Auto</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Consecutive Days (Auto-assigned)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', background: 'rgba(72, 187, 120, 0.12)', color: 'var(--accent-green)' }}>Manual</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Flexible Booking (User-selected)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeeklyView
