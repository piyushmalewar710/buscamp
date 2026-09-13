import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import QRDisplay from '../components/QRDisplay';

export default function MyTickets() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [tickets, setTickets] = useState({ upcoming: [], past: [], cancelled: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState(location.state?.success ? 'Ticket booked successfully!' : '');

  // const fetchTickets = async () => {
  //   setLoading(true);
  //   setError(null);
  //   try {
  //     const data = await apiGet('/api/tickets/mine');
      
  //     const now = new Date();
  //     const upcoming = [];
  //     const past = [];
  //     const cancelled = [];

  //     data.forEach(ticket => {
  //       if (ticket.status === 'cancelled') {
  //         cancelled.push(ticket);
  //       } else if (ticket.status === 'used' || new Date(`${ticket.trips.date}T${ticket.trips.departure_time}`) < now) {
  //         past.push(ticket);
  //       } else {
  //         upcoming.push(ticket);
  //       }
  //     });

  //     setTickets({ upcoming, past, cancelled });
  //   } catch (err) {
  //     setError(err.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/api/tickets/mine'); // { upcoming, past, cancelled }
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCancel = async (ticketId) => {
    if (!window.confirm('Are you sure you want to cancel this ticket? A ₹2 cancellation fee applies.')) return;
    try {
      await apiPost(`/api/tickets/${ticketId}/cancel`);
      fetchTickets();
    } catch (err) {
      alert(err.message || 'Failed to cancel ticket');
    }
  };

  const renderSkeletons = () => (
    [1, 2].map(i => (
      <div key={i} className="bg-white p-4 rounded-xl shadow-md animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-48 bg-gray-200 rounded-lg w-full"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    ))
  );

  const getDirectionText = (dir) => dir === 'college_to_city' ? 'College → City' : 'City → College';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Tickets</h1>
      
      {successMessage && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 flex items-center space-x-2">
          <span>✅</span><span>{successMessage}</span>
        </div>
      )}

      <div className="flex space-x-2 mb-6 border-b border-gray-200">
        {['upcoming', 'past', 'cancelled'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchTickets} />}

      <div className="space-y-6">
        {loading ? renderSkeletons() : (
          tickets[activeTab].length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
              <span className="text-4xl block mb-2">🎫</span>
              <p className="text-gray-500">No {activeTab} tickets found.</p>
            </div>
          ) : (
            tickets[activeTab].map(ticket => (
              <div key={ticket.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-blue-600 text-white p-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-lg">{getDirectionText(ticket.trips.direction)}</span>
                    <span className="bg-blue-800 px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">{new Date(ticket.trips.date).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div className="text-blue-100 text-sm">
                    {ticket.trips.departure_time.substring(0, 5)} • Bus {ticket.trips.buses?.bus_number || 'TBD'}
                  </div>
                </div>
                
                <div className="p-6 flex flex-col items-center border-b border-dashed border-gray-200 relative">
                  {/* Ticket notches */}
                  <div className="absolute -left-3 -bottom-3 w-6 h-6 bg-gray-50 rounded-full border-t border-r border-gray-200 transform rotate-45"></div>
                  <div className="absolute -right-3 -bottom-3 w-6 h-6 bg-gray-50 rounded-full border-t border-l border-gray-200 transform -rotate-45"></div>
                  
                  {activeTab === 'upcoming' ? (
                    <QRDisplay token={ticket.qr_token} />
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      QR Code no longer valid
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 flex justify-between items-center">
                  <div>
                    {activeTab === 'upcoming' && <p className="text-xs text-gray-500 mb-2">₹2 cancellation fee applies</p>}
                    <span className="text-sm font-mono text-gray-600 uppercase">ID: {ticket.id.split('-')[0]}</span>
                  </div>
                  
                  {activeTab === 'upcoming' && (
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => navigate(`/transfer/${ticket.id}`)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                      >
                        Transfer
                      </button>
                      <button 
                        onClick={() => handleCancel(ticket.id)}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {activeTab === 'cancelled' && (
                    <span className="text-sm text-red-600 font-medium">Refund Processing</span>
                  )}
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
