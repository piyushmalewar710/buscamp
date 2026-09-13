import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function ConductorDashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/api/conductor/trips/today');
      setTrips(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Today's Assigned Trips</h1>
      
      {error && <ErrorBanner message={error} onRetry={fetchTrips} />}

      <div className="space-y-4">
        {trips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <span className="text-4xl block mb-2">🚏</span>
            <p className="text-gray-500">No trips assigned for today.</p>
          </div>
        ) : (
          trips.map(trip => (
            <div key={trip.id} className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {trip.direction === 'college_to_city' ? 'College → City' : 'City → College'}
                  </h3>
                  <div className="text-sm text-gray-500 mt-1 space-y-1">
                    <p>Departure: {trip.departure_time.substring(0, 5)}</p>
                    <p>Bus: {trip.buses?.bus_number}</p>
                    <p>Seats Sold: {trip.seats_sold} / {trip.total_seats}</p>
                  </div>
                </div>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {trip.status}
                </div>
              </div>
              
              <button
                onClick={() => navigate(`/conductor/scan/${trip.id}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <span>📷</span>
                <span>Start Scanning Boarding Passes</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
