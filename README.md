# Fishing Booking System

A comprehensive booking management system for fishing beats and loch, built with React and Vite.

## Features

### Admin Dashboard
- **Session Management**: Fishing season 2026 (January 1 - March 3)
- **Weekly Structure**: Monday through Saturday (6-day weeks)
- **Real-time Statistics**: 
  - Total bookings count
  - Available slots remaining
  - Booked slots count
  - Total weeks in the session
- **Beat & Loch Usage**: Visual breakdown of all 6 resources (5 Beats + 1 Loch) showing day-bookings
- **Booking Management**: View all bookings with details and delete functionality

### Smart Booking System

#### Two Booking Types:

**1. Consecutive Days (Auto-Assignment)**
- System automatically assigns **different beats/lochs for each consecutive day**
- Prevents beat duplication across multiple days
- Ideal for multi-day bookings
- Example: 3-day booking → Day 1: Beat 1, Day 2: Beat 2, Day 3: Beat 3

**2. Flexible Booking (Manual Selection)**
- User chooses specific beat/loch for each day
- Perfect for low occupancy periods or specific preferences
- Can select same or different beats per day
- Full control over resource allocation

### Intelligent Availability Management
- **Auto-Disable Fully Booked Days**: Days with no available beats are automatically disabled
- **Real-time Availability**: Shows available beats for each day during selection
- **Conflict Prevention**: Prevents double-booking on the same beat/day
- **Visual Feedback**: Color-coded availability indicators

### Booking Form
- **Person Details**: Name, email, and phone number
- **Week Selection**: Choose from all available weeks in the season
- **Booking Type Selection**: 
  - Consecutive Days: Auto-assigns different beats
  - Flexible: Manual beat selection per day
- **Day Selection**: Interactive calendar showing Monday-Saturday
- **Smart Validation**:
  - Prevents double booking on the same beat/day
  - Shows available vs fully booked days
  - Displays available beats for flexible bookings
  - Preview for consecutive day assignments

### Weekly View
- **6-Day Grid**: Monday through Saturday layout
- **Beat-Centric Display**: Columns for each beat/loch (6 columns)
- **Day Rows**: Each row represents a day of the week
- **Booking Details**: View who booked each slot with contact information
- **Type Indicators**: Shows "Auto" (consecutive) or "Manual" (flexible) bookings
- **Week-by-Week Navigation**: Browse through different weeks

## Booking Rules

1. **Season Period**: January 1, 2026 - March 3, 2026
2. **Weekly Schedule**: Monday - Saturday (6 days per week)
3. **Resources**: 6 total (Beat 1-5 + Loch)
4. **No Double Booking**: Each beat can only be allocated to one person per day
5. **Consecutive Day Rule**: Auto-assigns different beat/loch each day
6. **Flexible Selection**: User chooses available beats per day
7. **Auto-Disable**: Fully booked days/beats are automatically disabled

## Default Data

The system comes pre-loaded with sample data:
- **Season**: January 1, 2026 - March 3, 2026
- **Booking 1**: Raju - 6 days, Consecutive (Week 1)
  - Auto-assigned: Beat 1→Beat 2→Beat 3→Beat 4→Beat 5→Loch
- **Booking 2**: Meena - 3 days, Flexible (Week 5)
  - Manually selected: Beat 2 for all 3 days

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
The application will be available at `http://localhost:5173/` (or next available port)

### Build for Production
```bash
npm run build
```

## Technology Stack

- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS 3**: Styling
- **Lucide React**: Icons

## Project Structure

```
src/
├── components/
│   ├── Dashboard.jsx      # Statistics and booking list
│   ├── BookingForm.jsx    # Smart booking form with auto-assignment
│   └── WeeklyView.jsx     # 6-day weekly grid view
├── utils/
│   └── dateHelpers.js     # Date calculations and beat allocation logic
├── App.jsx                # Main application component
├── main.jsx              # Application entry point
└── index.css             # Global styles with Tailwind
```

## Usage Guide

### Creating a Booking

1. **Click "New Booking"** from the dashboard
2. **Enter Person Details**: Name, email, phone
3. **Select Week**: Choose from available weeks
4. **Choose Booking Type**:
   - **Consecutive Days**: For multi-day bookings with auto-rotation
   - **Flexible**: For custom beat selection per day
5. **Select Days**: Click on available days (Monday-Saturday)
   - Fully booked days will be disabled
6. **For Flexible Bookings**: Select beat/loch for each chosen day
   - Already booked beats will be disabled
7. **Submit**: Review and confirm booking

### Viewing Bookings

- **Dashboard**: See all bookings in a table with statistics
- **Weekly View**: Visual grid showing beat allocation by day
- **Legend**: Understand color codes and booking types

## Key Improvements

✅ **Smart Auto-Assignment**: Different beats for consecutive days  
✅ **6-Day Week**: Monday-Saturday scheduling  
✅ **Real-time Availability**: Auto-disable fully booked slots  
✅ **Flexible Options**: Manual beat selection for low occupancy  
✅ **Visual Feedback**: Clear indicators for availability  
✅ **Conflict Prevention**: No double-booking possible  

## Future Enhancements

- Edit existing bookings
- Export booking reports (PDF/Excel)
- Email notifications to customers
- Calendar integration (iCal export)
- Multi-season support
- Weather integration
- Customer portal (self-service booking)

---

Built with ❤️ using React and Vite  
Fishing Season 2026 🎣
