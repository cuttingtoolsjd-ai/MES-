// ScrapModal.js
import { useState } from 'react';

export default function ScrapModal({ open, onClose, onSubmit, item }) {
  const [reason, setReason] = useState('');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    onSubmit({ reason, qty: Number(qty) });
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-4">Move to Scrap</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input 
              type="number" 
              value={qty} 
              min={1} 
              max={item?.quantity || 1} 
              onChange={e => {
                const value = e.target.value;
                if (value === '' || value === null || value === undefined) {
                  setQty(1);
                  return;
                }
                const numValue = parseFloat(value);
                if (!isNaN(numValue) && numValue >= 1 && numValue <= (item?.quantity || 1)) {
                  setQty(numValue);
                }
              }} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md" 
              required 
              step="1"
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium">{loading ? 'Moving...' : 'Move to Scrap'}</button>
            <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-medium">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
