import { X, Download, FileText, ExternalLink } from 'lucide-react';

export default function PDFViewer({ isOpen, onClose, fileUrl, title }) {
  if (!isOpen || !fileUrl) return null;

  // --- THE FIX ---
  // If the URL is relative (e.g. "uploads/file.pdf"), add the Backend URL
  // If it's already "http://...", leave it alone.
  const BACKEND_URL = 'http://localhost:5000';
  
  let cleanUrl = fileUrl;
  if (!fileUrl.startsWith('http')) {
      // Remove any leading slash to avoid double slashes
      const path = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
      cleanUrl = `${BACKEND_URL}/${path}`;
  }
  // ----------------

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-slate-900">Assignment File</h3>
          <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
          >
              <X size={20} />
          </button>
        </div>

        <div className="p-8 text-center">
            <div className="w-20 h-20 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText size={40} />
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 mb-2">{title || 'Document'}</h2>
            <p className="text-gray-500 text-sm mb-8">
                File Location: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{cleanUrl}</span>
            </p>

            <div className="flex flex-col gap-3">
                <a 
                    href={cleanUrl} 
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition"
                >
                    <ExternalLink size={18} /> Open in New Tab
                </a>

                <a 
                    href={cleanUrl} 
                    download
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl transition"
                >
                    <Download size={18} /> Download File
                </a>
            </div>
            
            <button 
                onClick={onClose}
                className="mt-6 text-sm text-gray-400 hover:text-gray-600"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
}