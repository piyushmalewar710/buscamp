import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminTrips() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [trips, setTrips] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    bus_id: '',
    direction: 'college_to_city',
    date: date,
    departure_time: '17:00',
    price: 20,
    total_seats: 50,
    sale_opens_at: `${date}T13:00`,
    sale_closes_at: `${date}T22:00`
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [t, b] = await Promise.all([
        apiGet(`/api/admin/trips?date=${date}`),
        apiGet('/api/admin/buses')
      ]);
      setTrips(t);
      setBuses(b);
      if (b.length > 0 && !formData.bus_id) {
        setFormData(prev => ({...prev, bus_id: b[0].id}));
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiPost('/api/admin/trips', formData);
      setShowModal(false);
      fetchData();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading && trips.length === 0) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Manage Trips</h1>
        <div className="flex items-center space-x-4">
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 text-sm"
          />
          <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Add Trip
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="p-3">Direction</th>
              <th className="p-3">Bus</th>
              <th className="p-3">Time</th>
              <th className="p-3">Price</th>
              <th className="p-3">Seats</th>
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 ? (
              <tr><td colSpan="5" className="p-4 text-center">No trips found for this date.</td></tr>
            ) : trips.map(trip => (
              <tr key={trip.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3">{trip.direction === 'college_to_city' ? 'College → City' : 'City → College'}</td>
                <td className="p-3">{trip.buses?.bus_number}</td>
                <td className="p-3">{trip.departure_time.substring(0, 5)}</td>
                <td className="p-3">₹{trip.price}</td>
                <td className="p-3">{trip.total_seats}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-md my-8">
            <h2 className="text-xl font-bold mb-4">Add Trip</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bus</label>
                <select className="w-full border p-2 rounded" value={formData.bus_id} onChange={e => setFormData({...formData, bus_id: e.target.value})}>
                  {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number} ({b.capacity} seats)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Direction</label>
                <select className="w-full border p-2 rounded" value={formData.direction} onChange={e => setFormData({...formData, direction: e.target.value})}>
                  <option value="college_to_city">College → City</option>
                  <option value="city_to_college">City → College</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" required className="w-full border p-2 rounded" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input type="time" required className="w-full border p-2 rounded" value={formData.departure_time} onChange={e => setFormData({...formData, departure_time: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (₹)</label>
                  <input type="number" required className="w-full border p-2 rounded" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total Seats</label>
                  <input type="number" required className="w-full border p-2 rounded" value={formData.total_seats} onChange={e => setFormData({...formData, total_seats: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
