import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function TransferTicket() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rollNumber, setRollNumber] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const data = await apiGet('/api/tickets/mine');
        const found = data.find(t => t.id === ticketId);
        if (!found) throw new Error('Ticket not found or not eligible for transfer');
        setTicket(found);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [ticketId]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setTransferring(true);
    setError(null);
    try {
      await apiPost(`/api/tickets/${ticketId}/transfer`, { to_roll_number: rollNumber.toUpperCase() });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to transfer ticket');
    } finally {
      setTransferring(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl shadow-md text-center">
        <span className="text-5xl block mb-4">📤</span>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer Requested</h2>
        <p className="text-gray-600 mb-6">
          A transfer request has been sent to <strong>{rollNumber.toUpperCase()}</strong>. 
          Your ticket remains active until they accept it.
        </p>
        <button 
          onClick={() => navigate('/tickets')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
        >
          Back to Tickets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={() => navigate('/tickets')} className="text-gray-500 hover:text-gray-900">
          ← Back
        </button>
        <h1 className="text-2xl font-bold">Transfer Ticket</h1>
      </div>

      {error && <ErrorBanner message={error} />}

      {ticket && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Ticket Details</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Route: {ticket.trips.direction === 'college_to_city' ? 'College → City' : 'City → College'}</p>
              <p>Date: {new Date(ticket.trips.date).toLocaleDateString('en-GB')}</p>
              <p>Time: {ticket.trips.departure_time.substring(0, 5)}</p>
            </div>
          </div>

          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient's Roll Number
              </label>
              <input
                type="text"
                required
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. BT22001"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
              />
              <p className="text-xs text-gray-500 mt-2">
                The recipient must be registered on BUSCAMP. Once they accept, this ticket will be removed from your account.
              </p>
            </div>

            <button
              type="submit"
              disabled={transferring || !rollNumber}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg mt-4 disabled:opacity-50"
            >
              {transferring ? 'Sending Request...' : 'Send Transfer Request'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
