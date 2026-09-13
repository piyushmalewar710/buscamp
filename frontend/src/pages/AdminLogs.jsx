import React, { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await apiGet('/api/admin/logs?limit=50&offset=0');
        setLogs(data);
      } catch (e) {
        alert(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">System Logs</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3 whitespace-nowrap text-xs">{new Date(log.created_at).toLocaleString()}</td>
                <td className="p-3">{log.profiles?.full_name || 'System'}</td>
                <td className="p-3">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{log.action_type}</span>
                </td>
                <td className="p-3">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600">View JSON</summary>
                    <pre className="mt-2 bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
