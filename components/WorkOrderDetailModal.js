
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { listStockMovements } from '../lib/stock';
import WorkOrderStatusTracker from './WorkOrderStatusTracker';

export default function WorkOrderDetailModal({ order, onClose, user }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockIssues, setStockIssues] = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [workOrder, setWorkOrder] = useState(order);

  useEffect(() => {
    if (!order) return;
    fetchData();
  }, [order]);

  async function fetchData() {
    // Fetch latest work order data
    const { data: woData, error: woError } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', order.id)
      .single();
    
    if (!woError && woData) {
      setWorkOrder(woData);
    }

    // Fetch assignments
    setLoading(true);
    const { data, error } = await supabase
      .from('machine_assignments')
      .select('id, machine, work_order_id, assigned_korv, notes, assigned_at, status, released_at, is_active, started_at, order')
      .eq('work_order_id', order.id)
      .order('assigned_at', { ascending: true });
    console.log('Fetching assignments for WO:', order.id, 'Data:', data, 'Error:', error);
    setAssignments(data || []);
    setLoading(false);

    // Fetch stock issues
    setLoadingStock(true);
    const { data: stockData, error: stockError } = await listStockMovements({ workOrderId: order.id });
    setStockIssues(stockData || []);
    setLoadingStock(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-2 p-4 relative animate-fadein max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-bold text-blue-700">WO {workOrder.work_order_no}</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="mb-2">
          <div className="text-xs text-gray-500">{workOrder.tool_code} — {workOrder.tool_description}</div>
          <div className="text-xs text-gray-500">Qty: {workOrder.quantity}</div>
          <div className="text-xs text-gray-500">Status: <span className="font-semibold">{workOrder.status}</span></div>
        </div>
        <div className="mb-4 text-xs text-gray-400">Created: {workOrder.created_on?.slice(0,10)}</div>
        
        {/* Status Tracker */}
        {user && (
          <div className="mb-6">
            <WorkOrderStatusTracker 
              workOrder={workOrder} 
              user={user} 
              onUpdate={fetchData}
            />
          </div>
        )}
        
        <div className="mb-3 text-sm font-semibold text-gray-700">Assignments / Planning</div>
        {loading ? (
          <div className="text-center py-4 text-gray-400">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-4 text-gray-400">No assignments found.</div>
        ) : (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full text-xs border border-gray-200 rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Machine</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Department</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Shift</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Operator</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Korv</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Assigned At</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Done At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assignments.map((a) => {
                  let dept = '', shift = '', operator = '', extra = {};
                  try { 
                    extra = JSON.parse(a.notes || '{}'); 
                    dept = extra.dept || ''; 
                    shift = extra.shift || ''; 
                    operator = extra.operator || ''; 
                  } catch {}
                  const isActive = a.is_active && !a.released_at;
                  const isReleased = !!a.released_at;
                  return (
                    <tr
                      key={a.id}
                      className={
                        (isActive ? 'bg-blue-100 border-l-4 border-l-blue-600 ' : '') +
                        (isReleased ? 'bg-gray-50 text-gray-500' : '')
                      }
                    >
                      <td className="px-3 py-2 font-semibold text-blue-700 border-b">
                        <div className="flex items-center gap-2">
                          {a.machine}
                          {isActive && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded animate-pulse">
                              ⚡ ACTIVE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-600 border-b">
                        {dept ? dept.toUpperCase() : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 border-b capitalize">
                        {shift || '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 border-b">
                        {operator || '-'}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-gray-700 border-b">
                        {a.assigned_korv}
                      </td>
                      <td className="px-3 py-2 text-gray-500 border-b whitespace-nowrap">
                        {a.assigned_at?.slice(0,16).replace('T',' ')}
                      </td>
                      <td className="px-3 py-2 text-center border-b">
                        {isActive ? (
                          <span className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
                            Working
                          </span>
                        ) : isReleased ? (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                            Done
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-gray-500 border-b whitespace-nowrap">
                        {a.released_at ? (
                          <span className="text-emerald-600">{a.released_at.slice(0,16).replace('T',' ')}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
