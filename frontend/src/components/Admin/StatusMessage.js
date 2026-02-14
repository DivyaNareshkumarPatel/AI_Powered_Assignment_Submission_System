import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

const StatusMessage = ({ message, error }) => {
  if (!message && !error) return null;

  return (
    <div className="mb-6">
      {message && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center border border-green-200">
          <CheckCircle className="mr-2" size={20} /> {message}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center border border-red-200">
          <AlertCircle className="mr-2" size={20} /> {error}
        </div>
      )}
    </div>
  );
};

export default StatusMessage;