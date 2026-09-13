import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function AdminDashboard() {
  const [data, setData] = useState({ summary: {}, trips: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tripsData = await apiGet('/api/admin/trips?date=today');
      
      let totalSeats = 0;
      let totalRevenue = 0;
      let completed = 0;

      tripsData.forEach(t => {
        totalSeats += t.seats_sold;
        totalRevenue += (t.seats_sold * t.price);
        if (t.status === 'completed') completed++;
      });

      setData({
        summary: {
          totalTrips: tripsData.length,
          totalSeats,
          totalRevenue,
          completed
        },
        trips: tripsData
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const markCompleted = async (tripId) => {
    if(!window.confirm('Mark this trip as completed?')) return;
    try {
      await apiPost('/api/admin/trips', { _method: 'PUT', id: tripId, status: 'completed' }); // assuming PUT mapped in admin trips
      fetchData();
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 font-medium">Total Trips Today</p>
          <p className="text-2xl font-bold">{data.summary.totalTrips}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-sm text-gray-500 font-medium">Seats Sold</p>
          <p className="text-2xl font-bold">{data.summary.totalSeats}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
          <p className="text-sm text-gray-500 font-medium">Revenue (₹)</p>
          <p className="text-2xl font-bold">₹{data.summary.totalRevenue}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-gray-500">
          <p className="text-sm text-gray-500 font-medium">Completed</p>
          <p className="text-2xl font-bold">{data.summary.completed}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-bold text-gray-700">Today's Trips</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <tr>
                <th className="p-3">Bus</th>
                <th className="p-3">Direction</th>
                <th className="p-3">Time</th>
                <th className="p-3">Seats (Sold/Total)</th>
                <th className="p-3">Revenue</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.trips.length === 0 ? (
                <tr><td colSpan="6" className="p-4 text-center text-gray-500">No trips today</td></tr>
              ) : (
                data.trips.map(trip => (
                  <tr key={trip.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium">{trip.buses?.bus_number}</td>
                    <td className="p-3">{trip.direction === 'college_to_city' ? 'C → City' : 'City → C'}</td>
                    <td className="p-3">{trip.departure_time.substring(0, 5)}</td>
                    <td className="p-3">{trip.seats_sold} / {trip.total_seats}</td>
                    <td className="p-3">₹{trip.seats_sold * trip.price}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trip.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-800'
                      }`}>
                        {trip.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
