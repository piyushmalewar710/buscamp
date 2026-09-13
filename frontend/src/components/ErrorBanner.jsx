import React from 'react';

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md my-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-red-500">⚠️</span>
          <p className="text-red-700 font-medium">{message}</p>
        </div>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
