import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Public/Common
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';

// Student
import StudentDashboard from './pages/StudentDashboard';
import MyTickets from './pages/MyTickets';
import TransferTicket from './pages/TransferTicket';
import IncomingTransfers from './pages/IncomingTransfers';

// Conductor
import ConductorDashboard from './pages/ConductorDashboard';
import ScanQR from './pages/ScanQR';

// Admin
import AdminDashboard from './pages/AdminDashboard';
import AdminBuses from './pages/AdminBuses';
import AdminTrips from './pages/AdminTrips';
import AdminConductors from './pages/AdminConductors';
import AdminLogs from './pages/AdminLogs';
import AdminTravellers from './pages/AdminTravellers';

function App() {
  const { session, profile, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="min-h-screen">
      {session && <Navbar />}
      <main className="p-4 max-w-2xl mx-auto pb-20 md:pb-4">
        <Routes>
          <Route path="/" element={
            session 
              ? (profile ? <Navigate to={`/${profile.role === 'student' ? 'dashboard' : profile.role}`} /> : <Navigate to="/onboarding" />)
              : <Navigate to="/login" />
          } />
          
          <Route path="/login" element={session ? <Navigate to="/" /> : <Login />} />
          
          <Route path="/onboarding" element={
            session && !profile ? <Onboarding /> : <Navigate to="/" />
          } />

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/tickets" element={<MyTickets />} />
            <Route path="/transfer/:ticketId" element={<TransferTicket />} />
            <Route path="/transfers/incoming" element={<IncomingTransfers />} />
          </Route>

          {/* Conductor Routes */}
          <Route element={<ProtectedRoute allowedRoles={['conductor']} />}>
            <Route path="/conductor" element={<ConductorDashboard />} />
            <Route path="/conductor/scan/:tripId" element={<ScanQR />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/buses" element={<AdminBuses />} />
            <Route path="/admin/trips" element={<AdminTrips />} />
            <Route path="/admin/conductors" element={<AdminConductors />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            <Route path="/admin/travellers" element={<AdminTravellers />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default App;
