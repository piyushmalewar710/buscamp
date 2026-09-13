import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ErrorBanner from '../components/ErrorBanner';

export default function Onboarding() {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    full_name: '',
    roll_number: '',
    department: 'CSE',
    role: 'student'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validateRollNumber = (roll) => {
    // 2 letters + 2 digits + 3 alphanumeric (e.g. BT22001)
    const regex = /^[A-Za-z]{2}\d{2}[A-Za-z0-9]{3}$/;
    return regex.test(roll);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!validateRollNumber(formData.roll_number)) {
      setError('Invalid roll number format. Example: BT22001');
      setLoading(false);
      return;
    }

    try {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: formData.full_name,
          roll_number: formData.roll_number.toUpperCase(),
          department: formData.department,
          role: formData.role
        });

      if (upsertError) throw upsertError;

      await fetchProfile(user.id);
      navigate(formData.role === 'student' ? '/dashboard' : `/${formData.role}`);
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Complete Your Profile</h2>
        
        {error && <ErrorBanner message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="full_name"
              required
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
            <input
              type="text"
              name="roll_number"
              required
              value={formData.roll_number}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
              placeholder="BT22001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="ME">Mechanical</option>
              <option value="Design">Design</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg mt-6 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
