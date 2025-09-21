# Event Buddy Frontend

Deployed Live: **https://eventai.munymunyhom.tech/**

A React-based frontend application for intelligent crowd simulation and event planning. This application allows event organizers to upload event data and venue layouts to receive smart crowd flow predictions and actionable recommendations.

## 🚀 Features

- **Event Creation**: Create new events with capacity, date, venue details
- **File Upload**: Upload ticketing data (CSV) and venue layouts (images/JSON)
- **Real-time Simulation**: Monitor simulation processing with live status updates
- **Interactive Dashboard**: View crowd density charts, venue hotspots, and scenario analysis
- **AI Recommendations**: Receive prioritized suggestions for crowd management
- **Event History**: Track and manage past event simulations
- **Responsive Design**: Modern, mobile-friendly interface built with Tailwind CSS

## 🛠️ Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **React Router** for navigation
- **Zustand** for state management
- **Axios** for API communication
- **Recharts** for data visualization
- **Lucide React** for icons
- **Tailwind CSS** for styling

## 📁 Project Structure

```
src/
├── api/
│   └── apiClient.ts         # Central Axios instance for API calls
├── assets/
│   ├── logo.svg
│   └── venue-layout-placeholder.png
├── components/
│   ├── common/              # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Spinner.tsx
│   ├── dashboard/           # Dashboard-specific components
│   │   ├── SimulationChart.tsx  # Crowd density over time (Recharts)
│   │   ├── VenueMap.tsx         # Venue layout with hotspots
│   │   ├── RecommendationCard.tsx # Actionable suggestions
│   │   └── ScenarioTabs.tsx     # Entry, exit, congestion views
│   └── layout/
│       ├── Navbar.tsx
│       └── Sidebar.tsx
├── hooks/
│   └── useSimulation.ts     # Custom hook for simulation data
├── pages/
│   ├── Dashboard.tsx        # Main simulation results page
│   ├── NewEvent.tsx         # Event creation form
│   └── History.tsx          # Past events and simulations
├── store/
│   └── eventStore.ts        # Global state management (Zustand)
├── App.tsx                  # Main app component with routing
└── main.tsx                 # Entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API server running (default: http://localhost:8000/api)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd event-ai-frontend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Create .env file (optional)
   echo "VITE_API_BASE_URL=http://localhost:8000/api" > .env
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## 📱 User Flow

1. **Create Event** (`/new-event`):
   - Fill out event details (name, capacity, date, venue)
   - Upload ticketing CSV and optional venue layout
   - Submit to start simulation

2. **Monitor Progress** (`/dashboard`):
   - View real-time simulation status
   - See processing indicator while AI analyzes data

3. **View Results** (`/dashboard`):
   - Interactive crowd density charts over time
   - Venue map with predicted hotspots highlighted
   - Prioritized recommendations for crowd management
   - Scenario analysis (entry, exit, congestion)

4. **Manage History** (`/history`):
   - Browse past events and simulations
   - Search and filter events
   - View summary statistics

## 🎨 Design Principles

Following React best practices from the project guidelines:

- **Functional Components**: All components use modern React hooks
- **TypeScript**: Full type safety throughout the application
- **Custom Hooks**: Reusable logic extracted (e.g., `useSimulation`)
- **State Management**: Zustand for global state, local state for component-specific data
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Accessibility**: Semantic HTML, ARIA attributes, keyboard navigation
- **Performance**: Memoization, lazy loading, and optimized re-renders

## 🔧 Configuration

### API Integration

The app expects a backend API with these endpoints:

- `POST /events` - Create new event simulation
- `GET /events/:id/simulation` - Get simulation results
- `GET /events/:id/status` - Check simulation status
- `GET /events` - Get event history
- `GET /events/:id` - Get specific event

### Environment Variables

- `VITE_API_BASE_URL`: Backend API base URL (default: http://localhost:8000/api)

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- ESLint configuration for React/TypeScript
- Tailwind CSS for consistent styling
- Prettier for code formatting (if configured)

## 🚀 Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting platform (Vercel, Netlify, etc.)

3. **Configure environment variables** for production API endpoints

## 📄 License

This project is part of the Event Buddy platform for intelligent event planning and crowd simulation.

A modern event-ops dashboard for venues and organizers — real-time crowd forecasts, zone layouts, and operational tools.

