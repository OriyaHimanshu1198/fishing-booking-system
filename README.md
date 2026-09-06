# 🎣 Fishing Booking System

A comprehensive booking management system for fishing beats and loch, built with **React 19 + Vite 8 + Tailwind CSS 3 + Supabase**.

![License](https://img.shields.io/badge/license-MIT-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Vite](https://img.shields.io/badge/Vite-8-646CFF)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E)

## ✨ Features

### 🎨 Modern Neumorphic UI
- Soft UI design with dual shadows and pastel gradients
- Dark mode with `localStorage` persistence
- Smooth animations and micro-interactions
- Fully responsive design

### 🔐 Admin Authentication
- Secure login system
- Session-based access control

### 📊 Dashboard
- **Real-time Statistics**: Total bookings, available slots, booked slots, total weeks
- **Beat & Loch Usage**: Visual breakdown of all 6 resources (5 Beats + 1 Loch)
- **Recent Bookings Table**: View and manage bookings with search and pagination
- **Season Configuration**: Edit season start/end dates

### 📅 Session/Season Management
- Create and manage multiple fishing seasons
- Switch between active and upcoming seasons
- Season status badges (active, upcoming, completed)
- Advance booking for upcoming seasons

### 🎣 Smart Booking System

**Two Booking Types:**

| Type | Description |
|------|-------------|
| **Consecutive Days** | Auto-assigns different beats/lochs for each consecutive day |
| **Flexible Booking** | User manually selects a specific beat/loch for each day |

### 📋 View All Bookings
- **Advanced Search**: Search by name, email, or phone
- **Multi-filter**: Filter by season, week, or beat/loch
- **Sortable columns**: Sort by name, week, or date
- **Expandable rows**: View booking details
- **Pagination**: 10 items per page
- **CSV Export**: Download filtered bookings as CSV

### 🖨️ Weekly View
- 6-day grid (Monday through Saturday)
- Beat-centric display with color-coded cells
- Print-friendly layout

### 🔔 UX Improvements
- **Toast Notifications**: Success/error/info messages with auto-dismiss
- **Confirm Modals**: Neumorphic confirmation dialogs replacing `confirm()`
- **Click-outside Handler**: Dropdown closes when clicking outside
- **Loading States**: Button spinners during form submissions
- **Pagination**: Navigate through large booking lists

## 📁 Project Structure

```
src/
├── components/
│   ├── BookingForm.jsx      # Smart booking form with auto-assignment
│   ├── ConfirmModal.jsx     # Neumorphic confirmation dialog
│   ├── Dashboard.jsx        # Statistics, season config, recent bookings
│   ├── LoginForm.jsx        # Admin authentication
│   ├── SessionSelector.jsx  # Season management cards
│   ├── Toast.jsx            # Notification component
│   ├── ToastContext.jsx     # Toast state management (React Context)
│   ├── ViewBookings.jsx     # All bookings with search/filter/sort/pagination
│   └── WeeklyView.jsx       # 6-day weekly grid view
├── utils/
│   └── dateHelpers.js       # Date calculations and beat allocation logic
├── App.jsx                  # Main application (routing, state, dark mode)
├── App.css                  # Neumorphic design system + animations
├── index.css                # Tailwind base styles
├── main.jsx                 # Application entry point
└── supabase.js              # Supabase client and API helpers
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **Vite 8** | Build tool and dev server |
| **Tailwind CSS 3** | Utility-first styling |
| **Supabase** | PostgreSQL database + API |
| **Lucide React** | Icon library |
| **Neumorphic Design** | Custom CSS design system |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- A [Supabase](https://supabase.com) account (free tier works)

### 1. Clone the repository
```bash
git clone https://github.com/OriyaHimanshu1198/fishing-booking-system.git
cd fishing-booking-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Supabase
1. Create a new project on [Supabase](https://supabase.com)
2. Go to **Settings → API** and copy:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **Anon/Public Key**
3. Create the required tables (see [SETUP_GUIDE.md](SETUP_GUIDE.md))

### 4. Configure environment variables
Create a `.env` file in the root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key
```

### 5. Run the application
```bash
npm run dev
```
The app will be available at `http://localhost:5173/`

### 6. Build for production
```bash
npm run build
```

## 📊 Database Schema

### Tables

**sessions**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | text | Season name (e.g., "2026 Season") |
| year | integer | Season year |
| start_date | date | Season start date |
| end_date | date | Season end date |
| status | text | 'active', 'upcoming', or 'completed' |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

**bookings**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | text | Guest full name |
| email | text | Guest email |
| phone | text | Guest phone |
| week | integer | Week number (1-13) |
| days_count | integer | Number of days booked |
| booking_type | text | 'consecutive' or 'flexible' |
| beat_allocations | jsonb | Day-to-beat mapping (e.g., `{"0":"Beat 1","1":"Beat 2"}`) |
| session_id | UUID | References sessions table |
| created_at | timestamp | Creation timestamp |

## 🎯 Booking Rules

1. **Season Period**: Configurable via admin
2. **Weekly Schedule**: Monday - Saturday (6 days per week)
3. **Resources**: 6 total (Beat 1-5 + Loch)
4. **No Double Booking**: Each beat can only be allocated to one person per day
5. **Consecutive Day Rule**: Auto-assigns different beat/loch each day
6. **Flexible Selection**: User chooses available beats per day
7. **Auto-Disable**: Fully booked days/beats are automatically disabled

## 🎨 Design System

### Neumorphic Design Tokens
```css
--bg-primary: #e8eef3      /* Main background */
--bg-secondary: #dfe6ed    /* Card backgrounds */
--shadow-light: #ffffff     /* Top-left highlight */
--shadow-dark: #bec8d1      /* Bottom-right shadow */
--accent-teal: #4fd1c5      /* Primary action color */
```

### Dark Mode
Toggle between light and dark themes. Preference is saved to `localStorage`.

## 📦 Deployment

### Netlify / Vercel
1. Push to GitHub
2. Import project in Netlify/Vercel
3. Set environment variables
4. Deploy

### Manual
```bash
npm run build
# Upload the 'dist' folder to your hosting provider
```

## 🔮 Future Enhancements

- [ ] Guest self-service booking page (no login required)
- [ ] Email notifications (booking confirmations, reminders)
- [ ] PDF booking confirmations
- [ ] Beat availability heatmap
- [ ] Waitlist for fully booked days
- [ ] Multi-year analytics
- [ ] Role-based access control
- [ ] Mobile PWA support

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ using React and Vite  
Fishing Season 2026 🎣
