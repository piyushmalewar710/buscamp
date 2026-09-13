import React, { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import BookingFlow from './BookingFlow';

export default function StudentDashboard() {
  const [direction, setDirection] = useState('College → City');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const dbDir = direction === 'College → City' ? 'college_to_city' : 'city_to_college';
      const data = await apiGet(`/api/trips?date=today&direction=${dbDir}`);
      setTrips(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    console.log('Raw trips from DB:', trips.length, trips);
  };

  useEffect(() => {
    fetchTrips();
  }, [direction]);

  useEffect(() => {
    if (trips.length === 0) return;

    const tripIds = trips.map(t => t.id);
    
    const channel = supabase
      .channel('public:trips')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'trips',
      }, (payload) => {
        if (tripIds.includes(payload.new.id)) {
          setTrips(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trips.length]); // Re-subscribe if the list changes

  const renderSkeletons = () => (
    [1, 2, 3].map(i => (
      <div key={i} className="bg-white p-4 rounded-xl shadow-md animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    ))
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Today's Trips</h1>
        <span className="text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
      </div>

      <div className="flex space-x-2 mb-6 bg-gray-200 p-1 rounded-lg">
        {['College → City', 'City → College'].map(dir => (
          <button
            key={dir}
            onClick={() => setDirection(dir)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              direction === dir ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {dir}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchTrips} />}

      <div className="space-y-4">
        {loading ? renderSkeletons() : (
          trips.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
              <span className="text-4xl block mb-2">🚏</span>
              <p className="text-gray-500">No trips scheduled for this route today.</p>
            </div>
          ) : (
            trips.map(trip => {
              const availableSeats = trip.total_seats - trip.seats_sold;
              const isFull = availableSeats <= 0;
              
              let badgeColor = 'bg-green-100 text-green-800';
              if (isFull) badgeColor = 'bg-red-100 text-red-800';
              else if (availableSeats <= 5) badgeColor = 'bg-amber-100 text-amber-800';

              const now = new Date();
              const saleOpen = new Date(trip.sale_opens_at) <= now;
              const saleClose = new Date(trip.sale_closes_at) <= now;
              const canBook = !isFull && saleOpen && !saleClose;

              // Extract bus number or fallback
              const busNumber = trip.buses?.bus_number || 'TBD';

              return (
                <div key={trip.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-semibold text-lg text-gray-900">
                        {trip.departure_time.substring(0, 5)} - Bus {busNumber}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColor}`}>
                          {isFull ? 'FULL' : `${availableSeats} seats left`}
                        </span>
                        <span>₹{trip.price}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedTrip(trip)}
                    disabled={!canBook}
                    className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
                      canBook 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {!saleOpen ? 'Sale Opens Later' : saleClose ? 'Sale Closed' : isFull ? 'Sold Out' : 'Book Seat'}
                  </button>
                </div>
              );
            })
          )
        )}
      </div>

      {selectedTrip && (
        <BookingFlow trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
      )}
    </div>
  );
}
