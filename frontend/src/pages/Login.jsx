import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import ErrorBanner from '../components/ErrorBanner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      
      setMessage('Check your email for a login link!');
    } catch (err) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚌 BUSCAMP</h1>
          <p className="text-gray-500">Sign in to book your college bus</p>
        </div>

        {error && <ErrorBanner message={error} />}
        
        {message ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg text-center">
            <span className="text-2xl block mb-2">✉️</span>
            {message}
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                College Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending link...' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
