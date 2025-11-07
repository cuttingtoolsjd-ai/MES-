import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function WorkOrderStatusTracker({ workOrder, onUpdate, user }) {
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(null);
  const [acceptQty, setAcceptQty] = useState('');
  const [showQualityActions, setShowQualityActions] = useState(false);
  const [qualityError, setQualityError] = useState('');

  // Define the workflow stages
  const stages = [
    { 
      key: 'factory_planning', 
      label: '🏭 Factory Planning',
      completed: !!workOrder.factory_planning_at,
      timestamp: workOrder.factory_planning_at,
      completedBy: workOrder.factory_planning_by,
      canComplete: user?.role === 'manager' || user?.role === 'admin'
    },
    { 
      key: 'production_completed', 
      label: '⚙️ Production',
      completed: !!workOrder.production_completed_at,
      timestamp: workOrder.production_completed_at,
      completedBy: workOrder.production_completed_by,
      canComplete: user?.role === 'manager' || user?.role === 'admin'
    },
    { 
      key: 'marking_completed', 
      label: '🏷️ Marking',
      completed: !!workOrder.marking_completed_at,
      timestamp: workOrder.marking_completed_at,
      completedBy: workOrder.marking_completed_by,
      notes: workOrder.marking_notes,
      canComplete: user?.role === 'manager' || user?.role === 'admin' || user?.role === 'operator',
      required: !!workOrder.marking
    },
    { 
      key: 'sent_to_coating', 
      label: '🎨 Sent to Coating',
      completed: !!workOrder.sent_to_coating_at,
      timestamp: workOrder.sent_to_coating_at,
      completedBy: workOrder.sent_to_coating_by,
      canComplete: user?.role === 'manager' || user?.role === 'admin',
      required: workOrder.coating_required
    },
    { 
      key: 'coating_completed', 
      label: '✅ Coating Done',
      completed: !!workOrder.coating_completed_at,
      timestamp: workOrder.coating_completed_at,
      completedBy: workOrder.coating_completed_by,
      notes: workOrder.coating_notes,
      canComplete: user?.role === 'manager' || user?.role === 'admin',
      required: workOrder.coating_required
    },
    { 
      key: 'ready_for_dispatch', 
      label: '📦 Ready for Dispatch',
      completed: !!workOrder.ready_for_dispatch_at,
      timestamp: workOrder.ready_for_dispatch_at,
      completedBy: workOrder.ready_for_dispatch_by,
      canComplete: user?.role === 'manager' || user?.role === 'admin'
    },
    { 
      key: 'dispatched', 
      label: '🚚 Dispatched',
      completed: !!workOrder.dispatched_at,
      timestamp: workOrder.dispatched_at,
      completedBy: workOrder.dispatched_by,
      notes: workOrder.dispatch_notes,
      canComplete: user?.role === 'manager' || user?.role === 'admin'
    }
  ];

  // Filter out stages that are not required
  const activeStages = stages.filter(stage => stage.required !== false);

  // Helper: auto-generate urgent work order on reject
  async function handleRejectWorkOrder() {
    console.log('🔴 REJECT BUTTON CLICKED!');
    setUpdating(true);
    setQualityError('');
    try {
      // Get the rejected quantity from input or use full quantity
      const rejectedQty = parseInt(acceptQty) || workOrder.quantity;
      
      // Calculate remaining quantity after rejection
      const remainingQty = workOrder.quantity - rejectedQty;
      
      // Create new work order number with _r suffix
      const newWoNo = `${workOrder.work_order_no}_r`;
      
      // Fetch original work order data
      const { data: origWO, error: fetchErr } = await supabase
        .from('work_orders')
        .select('*')
        .eq('id', workOrder.id)
        .single();
      
      if (fetchErr || !origWO) {
        throw new Error('Failed to fetch original work order');
      }
      
      // Create new rejected work order with same details (only use columns that exist)
      const rejectedWO = {
        work_order_no: newWoNo,
        drawing_no: origWO.drawing_no,
        customer_name: origWO.customer_name,
        po_number: origWO.po_number,
        tool_code: origWO.tool_code,
        tool_description: origWO.tool_description,
        quantity: rejectedQty,
        price_per_unit: origWO.price_per_unit,
        total_price: origWO.total_price,
        machine: origWO.machine,
        cycle_time: origWO.cycle_time,
        korv_per_unit: origWO.korv_per_unit,
        total_korv: origWO.total_korv,
        status: 'Planning Required',
        created_by: origWO.created_by,
        created_on: new Date().toISOString(),
        coating_required: origWO.coating_required,
        coating_type: origWO.coating_type,
        marking_required: origWO.marking_required,
        marking_notes: `[REJECTED] From WO ${workOrder.work_order_no}. Reason: ${notes || 'Quality issue'}`
      };
      
      // Insert new rejected work order
      const { error: insertErr } = await supabase
        .from('work_orders')
        .insert([rejectedWO]);
      
      if (insertErr) {
        throw new Error('Failed to create rejected work order: ' + insertErr.message);
      }
      
      // Update original work order quantity (only if there's remaining quantity)
      if (remainingQty > 0) {
        const { error: updateErr } = await supabase
          .from('work_orders')
          .update({ 
            quantity: remainingQty,
            status: 'Planning Required' // Reset to planning required
          })
          .eq('id', workOrder.id);
        
        if (updateErr) {
          throw new Error('Failed to update original work order: ' + updateErr.message);
        }
        
        alert(`✅ Rejected ${rejectedQty} units. New work order ${newWoNo} created.\nOriginal WO now has ${remainingQty} units.`);
      } else {
        // All units rejected - mark original as rejected
        const { error: updateErr } = await supabase
          .from('work_orders')
          .update({ 
            status: 'Rejected',
            marking_notes: `Rejected: ${notes || 'Quality issue'}`
          })
          .eq('id', workOrder.id);
        
        if (updateErr) {
          throw new Error('Failed to update original work order: ' + updateErr.message);
        }
        
        alert(`✅ All ${rejectedQty} units rejected. New work order ${newWoNo} created.`);
      }
      
      setShowQualityActions(false);
      setShowNotesInput(null);
      setNotes('');
      setAcceptQty('');
      if (onUpdate) onUpdate();
    } catch (err) {
      setQualityError('Error: ' + (err.message || err));
      console.error('Reject error:', err);
    } finally {
      setUpdating(false);
    }
  }

  // Accept (full/partial) for quality
  async function handleAcceptWorkOrder(partial) {
    setUpdating(true);
    setQualityError('');
    try {
      let updates = {
        quality_accepted_at: new Date().toISOString(),
        quality_accepted_by: user.username,
        status: 'Quality Done',
        quality_notes: notes
      };
      if (partial) {
        updates.status = 'Partially Accepted';
        updates.quality_partial_qty = Number(acceptQty);
      }
      await supabase
        .from('work_orders')
        .update(updates)
        .eq('id', workOrder.id);
      setShowQualityActions(false);
      setShowNotesInput(null);
      setNotes('');
      setAcceptQty('');
      alert(partial ? '✅ Work order partially accepted!' : '✅ Work order fully accepted!');
      if (onUpdate) onUpdate();
    } catch (err) {
      setQualityError('Error: ' + (err.message || err));
    } finally {
      setUpdating(false);
    }
  }

  const handleCompleteStage = async (stageKey) => {
    setUpdating(true);
    
    const updates = {
      [`${stageKey}_at`]: new Date().toISOString(),
      [`${stageKey}_by`]: user.username
    };

    // Add notes if provided
    if (notes.trim()) {
      updates[`${stageKey.replace('_completed', '').replace('sent_to_', '').replace('ready_for_', '')}_notes`] = notes;
    }

    // Update status based on stage
    let newStatus = workOrder.status;
    if (stageKey === 'factory_planning') {
      newStatus = 'Planning Done';
    } else if (stageKey === 'production_completed') {
      // When production is done, check if it needs coating or quality
      if (workOrder.coating_required) {
        newStatus = 'Quality Done'; // Goes to coating next
      } else {
        newStatus = 'Quality Done'; // Goes to marking/dispatch
      }
    } else if (stageKey === 'coating_completed') {
      newStatus = 'Coating Done';
    } else if (stageKey === 'marking_completed') {
      newStatus = 'Marking Done';
      // Automatically mark as ready for dispatch
      updates.ready_for_dispatch_at = new Date().toISOString();
      updates.ready_for_dispatch_by = user.username;
      newStatus = 'Ready for Dispatch';
    } else if (stageKey === 'sent_to_coating') {
      newStatus = 'At Coating';
    } else if (stageKey === 'ready_for_dispatch') {
      newStatus = 'Ready for Dispatch';
    } else if (stageKey === 'dispatched') {
      newStatus = 'Dispatched';
    }

    updates.status = newStatus;

    const { error } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', workOrder.id);

    setUpdating(false);
    setShowNotesInput(null);
    setNotes('');

    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      alert(`✅ ${stages.find(s => s.key === stageKey)?.label} marked as complete!`);
      if (onUpdate) onUpdate();
    }
  };

  const canCompleteStage = (stage, index) => {
    if (!stage.canComplete) return false;
    if (stage.completed) return false;
    
    // Check if previous stage is completed
    if (index > 0) {
      const prevStage = activeStages[index - 1];
      if (!prevStage.completed) return false;
    }
    
    return true;
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Work Order Progress</h3>
      
      <div className="space-y-3">
        {activeStages.map((stage, index) => (
          <div 
            key={stage.key}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 ${
              stage.completed 
                ? 'bg-green-50 border-green-300' 
                : canCompleteStage(stage, index)
                ? 'bg-blue-50 border-blue-300'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex-shrink-0 text-2xl">
              {stage.completed ? '✅' : canCompleteStage(stage, index) ? '⏳' : '⏸️'}
            </div>
            
            <div className="flex-1">
              <div className="font-bold text-gray-900">{stage.label}</div>
              
              {stage.completed && (
                <div className="text-xs text-gray-600 mt-1">
                  <div>✓ Completed by: <span className="font-semibold">{stage.completedBy}</span></div>
                  <div>✓ At: {new Date(stage.timestamp).toLocaleString()}</div>
                  {stage.notes && (
                    <div className="mt-1 text-gray-500">📝 {stage.notes}</div>
                  )}
                </div>
              )}
              
              {!stage.completed && !canCompleteStage(stage, index) && (
                <div className="text-xs text-gray-500 mt-1">
                  Waiting for previous step to complete
                </div>
              )}
              
              {canCompleteStage(stage, index) && (
                <div className="mt-2">
                  {/* Quality Accept/Reject UI for Quality/Coating Done stage */}
                  {stage.key === 'coating_completed' || stage.key === 'production_completed' ? (
                    showQualityActions ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Add notes (optional)"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                        <div className="text-xs text-gray-600 mb-1">
                          Total quantity: <span className="font-semibold">{workOrder.quantity}</span> units
                        </div>
                        <div className="flex gap-2 items-center flex-wrap">
                          <button
                            onClick={() => handleAcceptWorkOrder(false)}
                            disabled={updating}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                          >
                            {updating ? 'Accepting...' : 'Accept (Full)'}
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={workOrder.quantity}
                            value={acceptQty}
                            onChange={e => setAcceptQty(e.target.value)}
                            placeholder="Enter Qty"
                            className="w-24 px-2 py-1 border rounded text-sm"
                          />
                          <button
                            onClick={() => handleAcceptWorkOrder(true)}
                            disabled={updating || !acceptQty}
                            className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-medium disabled:opacity-50"
                          >
                            {updating ? 'Accepting...' : 'Accept Partial'}
                          </button>
                          <button
                            onClick={(e) => {
                              console.log('🔴 Button element clicked, event:', e);
                              e.stopPropagation();
                              handleRejectWorkOrder();
                            }}
                            disabled={updating}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            {updating ? 'Rejecting...' : 'Reject'}
                          </button>
                          <button
                            onClick={() => {
                              setShowQualityActions(false);
                              setNotes('');
                              setAcceptQty('');
                            }}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          💡 Enter quantity to accept/reject partial. Leave empty to reject all.
                        </div>
                        {qualityError && <div className="text-xs text-red-600">{qualityError}</div>}
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowQualityActions(true)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                      >
                        Accept / Reject
                      </button>
                    )
                  ) : (
                    showNotesInput === stage.key ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Add notes (optional)"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCompleteStage(stage.key)}
                            disabled={updating}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                          >
                            {updating ? 'Updating...' : 'Confirm Complete'}
                          </button>
                          <button
                            onClick={() => {
                              setShowNotesInput(null);
                              setNotes('');
                            }}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNotesInput(stage.key)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                      >
                        Mark as Complete
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded border">
        <div className="text-sm font-semibold text-gray-700">Current Status:</div>
        <div className="text-lg font-bold text-blue-600">{workOrder.status}</div>
      </div>
    </div>
  );
}
