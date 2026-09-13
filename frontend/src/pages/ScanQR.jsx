import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { apiPost } from '../lib/api';

export default function ScanQR() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('scan');
  const [rollNumber, setRollNumber] = useState('');
  const [result, setResult] = useState(null); // { type: 'success' | 'error', message: '', details: {} }
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(true);

  // Handle result overlay timeout
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        setResult(null);
        if (activeTab === 'scan' && scanning && scannerRef.current) {
          try { scannerRef.current.resume(); } catch(e){}
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [result, activeTab, scanning]);

  // Setup Scanner
  useEffect(() => {
    if (activeTab !== 'scan') {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
        scannerRef.current = null;
      }
      return;
    }

    if (!scannerRef.current) {
      const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scannerRef.current = scanner;

      scanner.render(
        async (decodedText) => {
          if (!scanning) return;
          try {
            // Pause scanner while processing
            scanner.pause(true);
            const data = await apiPost('/api/conductor/scan', { qr_token: decodedText, trip_id: tripId });
            setResult({ type: 'success', message: 'Ticket Verified!', details: data.profile });
          } catch (err) {
            setResult({ type: 'error', message: err.message });
          }
        },
        (errorMessage) => {
          // ignore scan errors (just means no qr code found yet)
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
        scannerRef.current = null;
      }
    };
  }, [activeTab, tripId, scanning]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await apiPost('/api/conductor/manual-verify', { roll_number: rollNumber.toUpperCase(), trip_id: tripId });
      setResult({ type: 'success', message: 'Ticket Verified manually!', details: data.profile });
      setRollNumber('');
    } catch (err) {
      setResult({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={() => navigate('/conductor')} className="text-gray-500 hover:text-gray-900">
          ← Back
        </button>
        <h1 className="text-xl font-bold">Verify Tickets</h1>
      </div>

      <div className="flex space-x-2 mb-6">
        {['scan', 'manual'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERLAY */}
      {result && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${result.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          <div className={`bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm text-center border-t-8 ${result.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
            <div className="text-6xl mb-4">
              {result.type === 'success' ? '✅' : '❌'}
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${result.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {result.message}
            </h2>
            {result.details && (
              <div className="text-gray-700 mt-4 space-y-1">
                <p className="font-bold text-xl">{result.details.full_name}</p>
                <p className="font-mono text-lg">{result.details.roll_number}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCANNER VIEW */}
      <div className={activeTab === 'scan' ? 'block' : 'hidden'}>
        <div className="bg-white p-4 rounded-xl shadow-md mb-4">
          <div id="qr-reader" className="w-full overflow-hidden rounded-lg"></div>
        </div>
        <div className="text-center">
          <button 
            onClick={() => setScanning(!scanning)}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full font-medium"
          >
            {scanning ? 'Pause Scanner' : 'Resume Scanner'}
          </button>
        </div>
      </div>

      {/* MANUAL VIEW */}
      {activeTab === 'manual' && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm mb-4 border border-amber-200 flex space-x-2">
            <span>⚠️</span>
            <p>Manual verification will be flagged for admin audit.</p>
          </div>
          
          <form onSubmit={handleManualSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Roll Number
            </label>
            <input
              type="text"
              required
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. BT22001"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase mb-4"
            />
            <button
              type="submit"
              disabled={!rollNumber}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50"
            >
              Verify Ticket
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
