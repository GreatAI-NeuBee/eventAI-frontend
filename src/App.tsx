import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import NewEvent from './pages/NewEvent';
import History from './pages/History';
import User from './pages/User';
import OngoingEvent from './pages/OnGoingEvent';

// Import API testing utilities (available in browser console)
import './utils/apiTest';

function App() {
  return (
    <AuthProvider>
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
          <Route path="/history" element={
            <ProtectedRoute>
              <DashboardLayout>
                <History />
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
          <Route path="/ongoingevent" element={
            <ProtectedRoute>
              <DashboardLayout>
                <OngoingEvent />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* Catch all route redirects to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;