import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ActiveWorkOrdersTab() {
  const [activeOrders, setActiveOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveWorkOrders();
    const interval = setInterval(fetchActiveWorkOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchActiveWorkOrders() {
    try {
      // Fetch all active work orders
      const { data: active, error: activeError } = await supabase
        .from('machine_assignments')
        .select('*, work_orders(*)')
        .eq('is_active', true)
        .is('released_at', null)
        .order('machine');

      if (activeError) throw activeError;

      // Fetch all non-released work orders for emergency swap options
      const { data: all, error: allError } = await supabase
        .from('machine_assignments')
        .select('*, work_orders(*)')
        .is('released_at', null)
        .order('machine')
        .order('order');

      if (allError) throw allError;

      setActiveOrders(active || []);
      setAllOrders(all || []);
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePauseWorkOrder(assignmentId, machine) {
    const confirmed = confirm(
      `⏸️ Pause the active work on ${machine}?\n\n` +
      'This will:\n' +
      '• Stop the current work order\n' +
      '• Free up the machine for emergency work\n' +
      '• Keep the work order in the queue\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('machine_assignments')
      .update({ is_active: false })
      .eq('id', assignmentId);

    if (error) {
      alert('Error pausing work order: ' + error.message);
    } else {
      alert(`✅ Work order paused on ${machine}`);
      fetchActiveWorkOrders();
    }
  }

  async function handleEmergencySwap(currentAssignmentId, newAssignmentId, machine) {
    const confirmed = confirm(
      `🚨 EMERGENCY SWAP on ${machine}?\n\n` +
      'This will:\n' +
      '• Stop the current work order immediately\n' +
      '• Start the new work order instead\n' +
      '• The operator will see this change instantly\n\n' +
      '⚠️ Only use this for urgent situations!\n\n' +
      'Proceed with emergency swap?'
    );

    if (!confirmed) return;

    try {
      // Pause current work
      await supabase
        .from('machine_assignments')
        .update({ is_active: false })
        .eq('id', currentAssignmentId);

      // Start new work
      const { error } = await supabase
        .from('machine_assignments')
        .update({ 
          is_active: true,
          started_at: new Date().toISOString()
        })
        .eq('id', newAssignmentId);

      if (error) throw error;

      alert(`✅ Emergency swap completed on ${machine}!`);
      fetchActiveWorkOrders();
    } catch (error) {
      alert('Error performing emergency swap: ' + error.message);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading active work orders...</div>;
  }

  const machines = [...new Set(allOrders.map(o => o.machine))].sort();

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
        <h3 className="text-lg font-bold text-blue-900 mb-2">🏭 Active Work Orders Monitor</h3>
        <p className="text-blue-700 text-sm">
          View what's currently being worked on each machine. Use emergency swap for urgent situations only.
        </p>
      </div>

      {activeOrders.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-lg">No work orders currently active on any machine.</p>
          <p className="text-gray-400 text-sm mt-2">Operators will mark work as "Start" when they begin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {activeOrders.map(active => {
            const woDetails = active.work_orders;
            const woNumber = woDetails?.work_order_no || active.work_order_id;
            const machineOrders = allOrders.filter(o => o.machine === active.machine && !o.is_active);
            
            return (
              <div key={active.id} className="bg-blue-100 border-4 border-blue-500 rounded-lg p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-lg">
                        {active.machine}
                      </span>
                      <span className="px-3 py-1 bg-green-600 text-white font-bold rounded animate-pulse">
                        ⚡ WORKING NOW
                      </span>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 mb-3">
                      <div className="font-bold text-xl text-gray-900 mb-2">
                        WO: {woNumber}
                      </div>
                      {woDetails && (
                        <>
                          <div className="text-gray-700">
                            <span className="font-medium">Tool:</span> {woDetails.tool_code}
                          </div>
                          <div className="text-gray-700">
                            <span className="font-medium">Quantity:</span> {woDetails.quantity} • 
                            <span className="font-medium ml-2">Korv:</span> {active.assigned_korv}
                          </div>
                        </>
                      )}
                      <div className="text-sm text-gray-500 mt-2">
                        Started: {new Date(active.started_at).toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() => handlePauseWorkOrder(active.id, active.machine)}
                      className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 font-medium"
                    >
                      ⏸️ Pause This Work
                    </button>
                  </div>

                  {/* Emergency Swap Options */}
                  <div className="w-96 bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <div className="font-bold text-red-900 mb-2 flex items-center gap-2">
                      🚨 Emergency Swap
                    </div>
                    <p className="text-red-700 text-xs mb-3">
                      Replace current work with urgent work order
                    </p>
                    
                    {machineOrders.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No other work available for this machine</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {machineOrders.map(wo => {
                          const woDetails = wo.work_orders;
                          const woNumber = woDetails?.work_order_no || wo.work_order_id;
                          
                          return (
                            <div
                              key={wo.id}
                              className="bg-white border border-red-200 rounded p-2 hover:bg-red-50 cursor-pointer"
                              onClick={() => handleEmergencySwap(active.id, wo.id, active.machine)}
                            >
                              <div className="font-medium text-gray-900 text-sm">
                                WO: {woNumber}
                              </div>
                              {woDetails && (
                                <div className="text-xs text-gray-600">
                                  {woDetails.tool_code} • Korv: {wo.assigned_korv}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All Machines Overview */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 All Machines Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {machines.map(machine => {
            const hasActive = activeOrders.some(a => a.machine === machine);
            return (
              <div
                key={machine}
                className={`px-4 py-3 rounded-lg font-bold text-center ${
                  hasActive
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {machine}
                <div className="text-xs font-normal mt-1">
                  {hasActive ? '⚡ Active' : '⏸️ Idle'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
