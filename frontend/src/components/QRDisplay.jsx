import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRDisplay({ token }) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (token) {
      QRCode.toDataURL(token, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      .then(url => setQrUrl(url))
      .catch(err => console.error('QR Generate Error:', err));
    }
  }, [token]);

  if (!qrUrl) return <div className="w-[280px] h-[280px] bg-gray-100 animate-pulse rounded-xl mx-auto border-2 border-dashed border-gray-300"></div>;

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="p-2 bg-white rounded-xl shadow-sm border-2 border-blue-100">
        <img 
          src={qrUrl} 
          alt="Ticket QR Code" 
          className="w-full max-w-[280px] rounded-lg"
        />
      </div>
      <a 
        href={qrUrl}
        download="buscamp-ticket.png"
        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
      >
        <span>⬇️</span>
        <span>Download QR</span>
      </a>
    </div>
  );
}
