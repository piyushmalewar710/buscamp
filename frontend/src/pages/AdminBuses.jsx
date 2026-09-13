import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminBuses() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ bus_number: '', capacity: 50, contractor_name: '' });

  const fetchBuses = async () => {
    try {
      const data = await apiGet('/api/admin/buses');
      setBuses(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiPost('/api/admin/buses', formData);
      setShowModal(false);
      setFormData({ bus_number: '', capacity: 50, contractor_name: '' });
      fetchBuses();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bus?')) return;
    try {
      await apiDelete(`/api/admin/buses?id=${id}`);
      fetchBuses();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Buses</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Add Bus
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="p-3">Bus Number</th>
              <th className="p-3">Capacity</th>
              <th className="p-3">Contractor</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {buses.map(bus => (
              <tr key={bus.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3 font-medium">{bus.bus_number}</td>
                <td className="p-3">{bus.capacity}</td>
                <td className="p-3">{bus.contractor_name}</td>
                <td className="p-3">
                  <button onClick={() => handleDelete(bus.id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Add Bus</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bus Number</label>
                <input required type="text" className="w-full border p-2 rounded" value={formData.bus_number} onChange={e => setFormData({...formData, bus_number: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Capacity</label>
                <input required type="number" min="1" className="w-full border p-2 rounded" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contractor</label>
                <input required type="text" className="w-full border p-2 rounded" value={formData.contractor_name} onChange={e => setFormData({...formData, contractor_name: e.target.value})} />
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
