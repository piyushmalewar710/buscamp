import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { profile, signOut } = useAuth();

  const renderLinks = () => {
    if (!profile) return null;

    if (profile.role === 'student') {
      return (
        <>
          <Link to="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Dashboard</Link>
          <Link to="/tickets" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">My Tickets</Link>
          <Link to="/transfers/incoming" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Transfers</Link>
        </>
      );
    }

    if (profile.role === 'conductor') {
      return (
        <Link to="/conductor" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Conductor Home</Link>
      );
    }

    if (profile.role === 'admin') {
      return (
        <>
          <Link to="/admin" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Dashboard</Link>
          <Link to="/admin/buses" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Buses</Link>
          <Link to="/admin/trips" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Trips</Link>
          <Link to="/admin/conductors" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Conductors</Link>
          <Link to="/admin/logs" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Logs</Link>
          <Link to="/admin/travellers" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Travellers</Link>
        </>
      );
    }
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2 font-bold text-xl">
              <span>🚌</span>
              <span>BUSCAMP</span>
            </Link>
            <div className="hidden md:flex items-center space-x-1">
              {renderLinks()}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {profile && <span className="text-sm font-medium hidden sm:block">Hi, {profile.full_name}</span>}
            <button 
              onClick={signOut}
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
        {/* Mobile menu - scrollable */}
        <div className="md:hidden flex overflow-x-auto py-2 space-x-2 scrollbar-hide">
          {renderLinks()}
        </div>
      </div>
    </nav>
  );
}
