import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import NewEvent from './pages/NewEvent';
import History from './pages/History';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing page (no layout) */}
        <Route path="/" element={<Landing />} />
        
        {/* Dashboard routes (with layout) */}
        <Route path="/dashboard" element={
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        } />
        <Route path="/new-event" element={
          <DashboardLayout>
            <NewEvent />
          </DashboardLayout>
        } />
        <Route path="/history" element={
          <DashboardLayout>
            <History />
          </DashboardLayout>
        } />
        
        {/* Catch all route redirects to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;