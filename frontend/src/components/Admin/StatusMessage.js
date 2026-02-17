import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

const StatusMessage = ({ message, error }) => {
  if (!message && !error) return null;

  return (
    <div className="mb-6">
      {message && (
        <div className="p-4 bg-white border-2 border-black text-black flex items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <CheckCircle className="mr-3" size={20} /> <span className="font-bold">{message}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-black text-white border-2 border-black flex items-center shadow-[4px_4px_0px_0px_rgba(150,150,150,1)]">
          <AlertCircle className="mr-3" size={20} /> <span className="font-bold">{error}</span>
        </div>
      )}
    </div>
  );
};

export default StatusMessage;