import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileType, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UploadData() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, building, detecting, done
  const [errorMSG, setErrorMSG] = useState('');
  const navigate = useNavigate();

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.csv')) {
      setFile(droppedFile);
      setErrorMSG('');
    } else {
      setErrorMSG('Please upload a valid CSV file.');
    }
  };

  const processData = async () => {
    if (!file) return;
    try {
      setStatus('uploading');
      
      // 1. Upload CSV
      const formData = new FormData();
      formData.append('file', file);
      
      let res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      
      // 2. Build Graph
      setStatus('building');
      res = await fetch('http://localhost:8000/api/build-graph', { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      
      // 3. Detect Fraud
      setStatus('detecting');
      res = await fetch('http://localhost:8000/api/detect-fraud', { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());

      setStatus('done');
      setTimeout(() => navigate('/dashboard'), 1500);

    } catch (err) {
      console.error(err);
      setErrorMSG('Processing Failed: ' + (err.message || 'Server Error'));
      setStatus('idle');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="max-w-xl w-full">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Upload GST Dataset</h2>
          <p className="text-textMuted">Upload your transactions to instantly map and expose fraudulent networks.</p>
        </div>

        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`glass-panel p-12 flex flex-col items-center border-2 border-dashed transition-all cursor-pointer ${
            file ? 'border-primary/50 bg-primary/5' : 'border-white/20 hover:border-primary/50'
          }`}
          onClick={() => document.getElementById('file-upload').click()}
        >
          <input 
            id="file-upload" 
            type="file" 
            accept=".csv" 
            className="hidden" 
            onChange={(e) => {
              if(e.target.files[0]) {
                setFile(e.target.files[0]);
                setErrorMSG('');
              }
            }} 
          />
          
          {file ? (
            <div className="flex flex-col items-center text-primary">
              <FileType size={64} className="mb-4" />
              <p className="text-xl font-bold">{file.name}</p>
              <p className="text-sm mt-1">Ready for analysis</p>
            </div>
          ) : (
            <>
              <UploadCloud size={64} className="text-textMuted mb-4" />
              <p className="text-lg font-medium text-white mb-1">Drag and drop your CSV here</p>
              <p className="text-sm text-textMuted">Required columns: seller, buyer, amount, gst, director</p>
            </>
          )}
        </div>

        {errorMSG && (
          <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center">
            <AlertCircle className="mr-3" size={20} />
            {errorMSG}
          </div>
        )}

        <div className="mt-8">
          <button 
            onClick={processData}
            disabled={!file || status !== 'idle'}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center space-x-3 ${
              !file 
                ? 'bg-surface text-textMuted cursor-not-allowed border border-white/10' 
                : 'bg-primary text-white neo-glow hover:bg-blue-600'
            }`}
          >
            {status === 'idle' && <span>Start Processing Pipeline</span>}
            {status !== 'idle' && status !== 'done' && <Loader2 className="animate-spin" size={24} />}
            {status === 'uploading' && <span>Uploading & Parsing CSV...</span>}
            {status === 'building' && <span>Constructing Knowledge Graph...</span>}
            {status === 'detecting' && <span>Running Subgraph Fraud Rules...</span>}
            {status === 'done' && (
              <>
                <CheckCircle size={24} />
                <span>Analysis Complete! Redirecting...</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
