import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminConductors() {
  const [conductors, setConductors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', email: '' });

  const fetchConductors = async () => {
    try {
      const data = await apiGet('/api/admin/conductors');
      setConductors(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConductors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiPost('/api/admin/conductors', formData);
      setShowModal(false);
      setFormData({ full_name: '', email: '' });
      fetchConductors();
      alert('Conductor created. They can login using Magic Link.');
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Conductors</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Add Conductor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
            </tr>
          </thead>
          <tbody>
            {conductors.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3 font-medium">{c.full_name}</td>
                <td className="p-3">{c.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Add Conductor</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input required type="text" className="w-full border p-2 rounded" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input required type="email" className="w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
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
