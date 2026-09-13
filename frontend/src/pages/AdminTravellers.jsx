import React, { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminTravellers() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState('');
  const [travellers, setTravellers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const t = await apiGet(`/api/admin/trips?date=${date}`);
        setTrips(t);
        if (t.length > 0) setTripId(t[0].id);
        else setTripId('');
      } catch (e) {
        console.error(e);
      }
    };
    fetchTrips();
  }, [date]);

  useEffect(() => {
    if (!tripId) {
      setTravellers([]);
      return;
    }
    const fetchTravellers = async () => {
      setLoading(true);
      try {
        const data = await apiGet(`/api/admin/travellers?trip_id=${tripId}`);
        setTravellers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTravellers();
  }, [tripId]);

  const handleExportCSV = async () => {
    if (!tripId) return;
    try {
      const csv = await apiGet(`/api/admin/travellers?trip_id=${tripId}&format=csv`);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `travellers_${tripId}.csv`;
      a.click();
    } catch (e) {
      alert('Failed to export CSV: ' + e.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Travellers List</h1>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Trip</label>
          <select 
            value={tripId} 
            onChange={e => setTripId(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 text-sm min-w-[200px]"
          >
            {trips.length === 0 && <option value="">No trips available</option>}
            {trips.map(t => (
              <option key={t.id} value={t.id}>
                {t.departure_time.substring(0, 5)} - {t.direction === 'college_to_city' ? 'Col→City' : 'City→Col'}
              </option>
            ))}
          </select>
        </div>
        <button 
          onClick={handleExportCSV}
          disabled={!tripId || travellers.length === 0}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <tr>
                <th className="p-3">Roll Number</th>
                <th className="p-3">Name</th>
                <th className="p-3">Department</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {travellers.length === 0 ? (
                <tr><td colSpan="4" className="p-4 text-center">No travellers found.</td></tr>
              ) : (
                travellers.map(t => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium uppercase">{t.profiles?.roll_number}</td>
                    <td className="p-3">{t.profiles?.full_name}</td>
                    <td className="p-3">{t.profiles?.department}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        t.status === 'used' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
