// AddIssueModal.js
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AddIssueModal({ open, onClose, onSubmit, item, actionType, presetWO = null }) {
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  // New: issue target
  const [issueMode, setIssueMode] = useState('OTHER'); // OTHER | WO
  const [woQuery, setWoQuery] = useState('');
  const [woOptions, setWoOptions] = useState([]);
  const [selectedWO, setSelectedWO] = useState(null); // { id, work_order_no, tool_code, tool_description }
  const [validationError, setValidationError] = useState('');

  const titles = {
    ADD: 'Add Stock',
    ISSUE: 'Issue Stock',
    ADJUST: 'Adjust Stock'
  };

  const buttonLabels = {
    ADD: 'Add',
    ISSUE: 'Issue',
    ADJUST: 'Adjust'
  };

  function handleSubmit(e) {
    e.preventDefault();
    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || (actionType !== 'ADJUST' && qtyNum <= 0)) return;
    if (actionType === 'ISSUE' && issueMode === 'WO' && !selectedWO) {
      // Require a work order when issuing to WO
      setValidationError('Please select a work order');
      return;
    }
    setValidationError('');
    setLoading(true);
    onSubmit({ qty: qtyNum, reason, actionType, issueMode, workOrder: selectedWO });
    setLoading(false);
    setQty(actionType === 'ADJUST' ? 0 : 1);
    setReason('');
    setIssueMode('OTHER');
    setSelectedWO(null);
  }

  // Fetch work orders for search when issuing to WO
  useEffect(() => {
    // If a preset work order is provided, preselect it and force WO mode
    if (open && presetWO) {
      setIssueMode('WO');
      setSelectedWO(presetWO);
    }

    let active = true;
    async function fetchWOs() {
      if (!open || actionType !== 'ISSUE' || issueMode !== 'WO') return;
      const q = (woQuery || '').trim().toLowerCase();
      // basic query: open work orders (exclude completed/done/closed/released)
      let query = supabase
        .from('work_orders')
        .select('id, work_order_no, tool_code, tool_description, status')
        .order('created_on', { ascending: false })
        .limit(25);
      const { data } = await query;
      const filtered = (data || []).filter(wo => {
        const s = (wo.status || '').toLowerCase();
        if (['completed','done','closed','released'].includes(s)) return false;
        if (!q) return true;
        return (
          (wo.work_order_no || '').toLowerCase().includes(q) ||
          (wo.tool_code || '').toLowerCase().includes(q) ||
          (wo.tool_description || '').toLowerCase().includes(q)
        );
      });
      if (active) setWoOptions(filtered);
    }
    fetchWOs();
    return () => { active = false; };
  }, [open, actionType, issueMode, woQuery]);

  // Check if this item has already been issued to the selected work order
  useEffect(() => {
    let active = true;
    async function checkDuplicate() {
      if (!selectedWO || !item) {
        setValidationError('');
        return;
      }
      
      const { data, error } = await supabase
        .from('stock_movements')
        .select('id')
        .eq('work_order_id', selectedWO.id)
        .eq('item_id', item.id)
        .eq('action', 'ISSUE')
        .limit(1);
      
      if (active && !error && data && data.length > 0) {
        setValidationError(`Item ${item.item_code} has already been issued to WO ${selectedWO.work_order_no}. Please reverse the previous entry first.`);
      } else if (active) {
        setValidationError('');
      }
    }
    checkDuplicate();
    return () => { active = false; };
  }, [selectedWO, item]);

  // Important: keep hooks above, and only conditionally render after hooks to maintain consistent hook order
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-4">{titles[actionType]} - {item?.item_name}</h3>
          {validationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {validationError}
            </div>
          )}
        <form onSubmit={handleSubmit} className="space-y-3">
          {actionType === 'ISSUE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Target</label>
              <div className="flex gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="issueMode" value="WO" checked={issueMode==='WO'} onChange={()=>setIssueMode('WO')} />
                  <span>Work Order</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="issueMode" value="OTHER" checked={issueMode==='OTHER'} onChange={()=>setIssueMode('OTHER')} />
                  <span>Other</span>
                </label>
              </div>
              {issueMode === 'WO' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={woQuery}
                    onChange={e=>setWoQuery(e.target.value)}
                    placeholder="Search WO number, tool code, description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded">
                    {woOptions.length === 0 ? (
                      <div className="p-2 text-sm text-gray-400">No matching open work orders</div>
                    ) : (
                      <ul className="divide-y">
                        {woOptions.map(wo => (
                          <li key={wo.id} className={`px-2 py-2 text-sm cursor-pointer ${selectedWO?.id===wo.id ? 'bg-blue-50' : ''}`}
                              onClick={()=>setSelectedWO(wo)}>
                            <div className="font-medium">WO: {wo.work_order_no}</div>
                            <div className="text-gray-500">{wo.tool_code} — {wo.tool_description}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {selectedWO && (
                    <div className="mt-2 text-xs text-blue-700">Selected WO: {selectedWO.work_order_no}</div>
                  )}
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input 
              type="number"
              value={qty}
              min={actionType === 'ISSUE' ? 0.001 : (actionType === 'ADJUST' ? -(item?.quantity || 0) : 0.001)}
              max={actionType === 'ISSUE' ? (item?.quantity || 0) : undefined}
              onChange={e => {
                const value = e.target.value;
                if (value === '' || value === null || value === undefined) {
                  setQty(actionType === 'ADJUST' ? 0 : 1);
                  return;
                }
                // Limit to 3 decimal places
                let numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  numValue = Math.round(numValue * 1000) / 1000;
                  if (actionType === 'ADJUST') {
                    const minVal = -(item?.quantity || 0);
                    setQty(Math.max(minVal, numValue));
                  } else {
                    setQty(Math.max(0.001, numValue));
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              step="0.001"
              inputMode="decimal"
              pattern="^\\d*(\\.\\d{0,3})?$"
            />
            {actionType === 'ISSUE' && (
              <p className="text-xs text-gray-500 mt-1">Available: {item?.quantity}</p>
            )}
            {actionType === 'ADJUST' && (
              <p className="text-xs text-gray-500 mt-1">Current: {item?.quantity} (use negative to decrease)</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
            <input 
              type="text" 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md" 
              placeholder={`Reason for ${actionType.toLowerCase()}...`}
            />
          </div>
          <div className="flex gap-2 mt-4">
          <button type="submit" disabled={loading || qty <= 0 || validationError} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? `${buttonLabels[actionType]}ing...` : buttonLabels[actionType]}
            </button>
            <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-medium">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}