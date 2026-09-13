import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function IncomingTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransfers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/api/transfers/incoming');
      setTransfers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleAction = async (id, action) => {
    try {
      await apiPost(`/api/transfers/${id}/${action}`);
      alert(`Transfer ${action}ed successfully`);
      fetchTransfers();
    } catch (err) {
      alert(err.message || `Failed to ${action} transfer`);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Incoming Ticket Transfers</h1>
      
      {error && <ErrorBanner message={error} onRetry={fetchTransfers} />}

      <div className="space-y-4">
        {transfers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <span className="text-4xl block mb-2">📫</span>
            <p className="text-gray-500">No pending transfers.</p>
          </div>
        ) : (
          transfers.map(t => (
            <div key={t.id} className="bg-white p-5 rounded-xl shadow-md border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">
                    From: {t.from_profile.full_name} ({t.from_profile.roll_number})
                  </span>
                </div>
                <p className="font-semibold text-gray-900">
                  {t.tickets.trips.direction === 'college_to_city' ? 'College → City' : 'City → College'}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(t.tickets.trips.date).toLocaleDateString()} at {t.tickets.trips.departure_time.substring(0, 5)}
                </p>
              </div>
              
              <div className="flex space-x-3 w-full sm:w-auto">
                <button 
                  onClick={() => handleAction(t.id, 'reject')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleAction(t.id, 'accept')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 shadow-sm"
                >
                  Accept Ticket
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
