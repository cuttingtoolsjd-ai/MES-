import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AVAILABLE_MACHINES = [
  'CNC1', 'CNC2', 'CNC3', 'CNC4', 'CNC5', 'CNC7',
  'CYLN1', 'CYLN2', 'CPX', 'TOPWORK',
  'OPG1', 'T&C1', 'T&C2',
  'COATING', 'EDM'
];

export default function SplitWorkOrderModal({ isOpen, onClose, workOrder, currentMachine, onSuccess, user }) {
  const [transferType, setTransferType] = useState('one-way'); // 'one-way' or 'two-way'
  const [targetMachine, setTargetMachine] = useState('');
  const [myWorkDescription, setMyWorkDescription] = useState('');
  const [myQuantity, setMyQuantity] = useState('');
  const [theirWorkDescription, setTheirWorkDescription] = useState('');
  const [theirQuantity, setTheirQuantity] = useState('');
  
  // For two-way swap
  const [theirWorkOrders, setTheirWorkOrders] = useState([]);
  const [selectedTheirWO, setSelectedTheirWO] = useState('');
  const [theirWOWorkDescription, setTheirWOWorkDescription] = useState('');
  const [theirWOQty, setTheirWOQty] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (transferType === 'two-way' && targetMachine) {
      // Fetch work orders assigned to target machine
      supabase
        .from('machine_assignments')
        .select(`
          id,
          work_order_id,
          assigned_korv,
          work_orders (
            work_order_no,
            tool_code
          )
        `)
        .eq('machine', targetMachine)
        .is('released_at', null)
        .then(({ data }) => setTheirWorkOrders(data || []));
    }
  }, [transferType, targetMachine]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      if (transferType === 'one-way') {
        // One-way transfer: give part of my WO to another machine
        const { error } = await supabase.from('machine_assignments').insert({
          work_order_id: workOrder.work_order_id,
          machine: targetMachine,
          assigned_korv: parseFloat(myQuantity) || 0,
          transfer_status: 'pending_approval',
          pending_operator: null, // Will be filled when an operator logs into that machine
          notes: JSON.stringify({
            work_description: theirWorkDescription,
            transfer_type: 'one-way',
            from_machine: currentMachine,
            transferred_by: user?.username || 'operator'
          })
        });

        if (error) throw error;
        setMessage('✅ Transfer sent! Waiting for operator approval on ' + targetMachine);
      } else {
        // Two-way swap: give part of my WO, get part of their WO
        // 1. Create assignment for their machine with part of my WO

        await supabase.from('machine_assignments').insert({
          work_order_id: workOrder.work_order_id,
          machine: targetMachine,
          assigned_korv: parseFloat(theirQuantity) || 0,
          transfer_status: 'pending_approval',
          pending_operator: null,
          notes: JSON.stringify({
            work_description: theirWorkDescription,
            transfer_type: 'two-way-out',
            from_machine: currentMachine,
            to_machine: targetMachine,
            transferred_by: user?.username || 'operator'
          })
        });

        // 2. Create assignment for my machine with part of their WO
        await supabase.from('machine_assignments').insert({
          work_order_id: selectedTheirWO,
          machine: currentMachine,
          assigned_korv: parseFloat(theirWOQty) || 0,
          transfer_status: 'pending_approval',
          pending_operator: user?.username,
          notes: JSON.stringify({
            work_description: theirWOWorkDescription,
            transfer_type: 'two-way-in',
            from_machine: targetMachine,
            to_machine: currentMachine,
            transferred_by: user?.username || 'operator'
          })
        });

        setMessage('✅ Swap request sent! Both operators must approve.');
      }

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Split/Transfer Work Order
          </h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
            <div className="font-medium">WO: {workOrder?.work_orders?.work_order_no || workOrder?.work_order_id}</div>
            <div className="text-sm text-gray-600">
              Current Machine: {currentMachine} • Korv: {workOrder?.assigned_korv}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Transfer Type */}
            <div>
              <label className="block font-medium mb-2">Transfer Type</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="one-way"
                    checked={transferType === 'one-way'}
                    onChange={(e) => setTransferType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>
                    <span className="font-medium">One-Way Transfer</span>
                    <span className="text-sm text-gray-600 ml-2">(Give part of my work to another machine)</span>
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="two-way"
                    checked={transferType === 'two-way'}
                    onChange={(e) => setTransferType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>
                    <span className="font-medium">Two-Way Swap</span>
                    <span className="text-sm text-gray-600 ml-2">(Exchange work with another machine)</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Target Machine */}
            <div>
              <label className="block font-medium mb-1">Target Machine</label>
              <select
                value={targetMachine}
                onChange={(e) => setTargetMachine(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">-- Select Machine --</option>
                {AVAILABLE_MACHINES.filter(m => m !== currentMachine).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* What I'm giving away */}
            <div className="bg-orange-50 border border-orange-200 rounded p-4">
              <h3 className="font-semibold text-orange-900 mb-3">
                {transferType === 'one-way' ? 'Transfer to ' + (targetMachine || 'target machine') : 'What I give to ' + (targetMachine || 'them')}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">What part of the work?</label>
                  <input
                    type="text"
                    value={theirWorkDescription}
                    onChange={(e) => setTheirWorkDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., Fluting, Face grinding, T&C work, etc."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Describe what operation/part you're transferring</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    value={theirQuantity}
                    onChange={(e) => setTheirQuantity(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., 50"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Two-way: What I'm receiving */}
            {transferType === 'two-way' && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <h3 className="font-semibold text-green-900 mb-3">What I receive from {targetMachine || 'them'}</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">Their Work Order</label>
                  <select
                    value={selectedTheirWO}
                    onChange={(e) => setSelectedTheirWO(e.target.value)}
                    className="w-full px-3 py-2 border rounded mb-3"
                    required
                  >
                    <option value="">-- Select Work Order --</option>
                    {theirWorkOrders.map(wo => (
                      <option key={wo.id} value={wo.work_order_id}>
                        WO: {wo.work_orders?.work_order_no || wo.work_order_id} ({wo.work_orders?.tool_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">What part of their work?</label>
                    <input
                      type="text"
                      value={theirWOWorkDescription}
                      onChange={(e) => setTheirWOWorkDescription(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., Face work, Cylindrical grinding, etc."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Describe what operation/part you're receiving</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity</label>
                    <input
                      type="number"
                      value={theirWOQty}
                      onChange={(e) => setTheirWOQty(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., 30"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {message && (
              <div className={`p-3 rounded ${message.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {message}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                {submitting ? 'Processing...' : transferType === 'one-way' ? 'Transfer' : 'Swap Work Orders'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
