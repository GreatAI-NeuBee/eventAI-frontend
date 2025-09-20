import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GoogleMapsProvider } from './contexts/GoogleMapsContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import NewEvent from './pages/NewEvent';
import EventDetails from './pages/EventDetails';
import User from './pages/User';

// Import API testing utilities (available in browser console)
import './utils/apiTest';

function App() {
  return (
    <AuthProvider>
      <GoogleMapsProvider>
        <Router>
          <Routes>
          {/* Landing page (no layout) */}
          <Route path="/" element={<Landing />} />
          
          {/* Protected Dashboard routes (with layout) */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/new-event" element={
            <ProtectedRoute>
              <DashboardLayout>
                <NewEvent />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/event/:eventId" element={
            <ProtectedRoute>
              <DashboardLayout>
                <EventDetails />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/user" element={
            <ProtectedRoute>
              <DashboardLayout>
                <User />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* Redirect old routes to dashboard */}
          <Route path="/history" element={<Navigate to="/dashboard" replace />} />
          <Route path="/ongoingevent" element={<Navigate to="/dashboard" replace />} />
          
          {/* Catch all route redirects to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </GoogleMapsProvider>
    </AuthProvider>
  );
}

export default App;