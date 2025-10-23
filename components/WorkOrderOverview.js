import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import WorkOrderDetailModal from './WorkOrderDetailModal';

export default function WorkOrderOverview({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      
      // First fetch work orders
      let query = supabase
        .from('work_orders')
        .select('id, work_order_no, tool_code, tool_description, quantity, assigned_to, status, production_status, created_on, total_korv')
        .order('created_on', { ascending: false });
      if (search) {
        query = query.ilike('work_order_no', `%${search}%`);
      }
      const { data: workOrders, error } = await query;
      
      if (error) {
        console.error('Error fetching work orders:', error);
        setLoading(false);
        return;
      }
      
      // Fetch machine assignments for each work order
      const { data: assignments, error: assignError } = await supabase
        .from('machine_assignments')
        .select('work_order_id, machine, is_active, assigned_korv, released_at')
        .in('work_order_id', workOrders.map(wo => wo.id));
      
      if (assignError) {
        console.error('Error fetching assignments:', assignError);
      }
      
      // Merge assignment data into work orders
      const enrichedOrders = workOrders.map(wo => {
        const woAssignments = assignments?.filter(a => a.work_order_id === wo.id) || [];
        const activeAssignments = woAssignments.filter(a => !a.released_at);
        const activeWorkingOn = activeAssignments.find(a => a.is_active);
        
        return {
          ...wo,
          machines: activeAssignments.map(a => a.machine),
          activeMachine: activeWorkingOn?.machine || null,
          assignedKorv: activeAssignments.reduce((sum, a) => sum + (a.assigned_korv || 0), 0),
          isActive: !!activeWorkingOn
        };
      });
      
      console.log('Work Orders fetched:', enrichedOrders?.length);
      setOrders(enrichedOrders || []);
      setLoading(false);
    }
    fetchOrders();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [search]);

  // Calculate statistics
  const stats = {
    total: orders.length,
    active: orders.filter(o => o.isActive).length,
    inProgress: orders.filter(o => o.production_status === 'In Progress' || o.status === 'In Progress').length,
    qualityDone: orders.filter(o => o.status === 'Quality Done' || o.status === 'Coating Done').length,
    readyForDispatch: orders.filter(o => o.status === 'Ready for Dispatch').length,
    dispatched: orders.filter(o => o.status === 'Dispatched').length,
    assigned: orders.filter(o => o.machines.length > 0).length,
    unassigned: orders.filter(o => o.machines.length === 0).length
  };

  return (
    <div className="p-2 sm:p-4">
      {/* Workflow Info Banner */}
      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 rounded">
        <div className="flex items-start gap-2">
          <span className="text-2xl">ℹ️</span>
          <div className="flex-1">
            <h4 className="font-bold text-blue-900 text-sm mb-1">Complete Workflow:</h4>
            <div className="text-xs text-blue-800 flex flex-wrap gap-2">
              <span className="bg-yellow-100 px-2 py-0.5 rounded">Planning Done</span>
              <span>→</span>
              <span className="bg-blue-100 px-2 py-0.5 rounded">In Progress</span>
              <span>→</span>
              <span className="bg-orange-100 px-2 py-0.5 rounded">Quality/Coating Done</span>
              <span>→</span>
              <span className="bg-purple-100 px-2 py-0.5 rounded">Marking</span>
              <span>→</span>
              <span className="bg-cyan-100 px-2 py-0.5 rounded font-bold">Ready for Dispatch 📤</span>
              <span>→</span>
              <span className="bg-emerald-100 px-2 py-0.5 rounded">Dispatched ✅</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
          <div className="text-xs text-blue-600 font-medium">Total Orders</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-700 flex items-center gap-1">
            ⚡ {stats.active}
          </div>
          <div className="text-xs text-green-600 font-medium">Active Now</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-700">{stats.inProgress}</div>
          <div className="text-xs text-yellow-600 font-medium">In Progress</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-orange-700">{stats.qualityDone}</div>
          <div className="text-xs text-orange-600 font-medium">Quality Done</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-cyan-700">{stats.readyForDispatch}</div>
          <div className="text-xs text-cyan-600 font-medium">Ready Dispatch</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-emerald-700">{stats.dispatched}</div>
          <div className="text-xs text-emerald-600 font-medium">Dispatched</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-700">{stats.assigned}</div>
          <div className="text-xs text-purple-600 font-medium">Assigned</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-700">{stats.unassigned}</div>
          <div className="text-xs text-red-600 font-medium">Unassigned</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 flex gap-2">
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="Search by work order number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="text-center py-6 text-gray-400">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-6 text-gray-400">No work orders found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white rounded-lg shadow">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">WO No.</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Tool Code</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700">Qty</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700">Korv</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700">Active On</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Assigned To</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700">
                  <div>Status</div>
                  <div className="text-xs font-normal text-gray-500">(Overall)</div>
                </th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700">
                  <div>Production</div>
                  <div className="text-xs font-normal text-gray-500">(Machine)</div>
                </th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700">Created</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map(order => (
                <tr 
                  key={order.id} 
                  className={`hover:bg-blue-50 cursor-pointer ${
                    order.isActive ? 'bg-blue-50' : ''
                  }`} 
                  onClick={() => setSelectedOrder(order)}
                >
                  <td className="px-3 py-2 font-semibold text-blue-700">{order.work_order_no}</td>
                  <td className="px-3 py-2 text-gray-600">{order.tool_code}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs max-w-xs truncate" title={order.tool_description}>
                    {order.tool_description}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600">{order.quantity}</td>
                  <td className="px-3 py-2 text-center text-gray-600">
                    {order.assignedKorv > 0 ? (
                      <span className="font-medium">{order.assignedKorv}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {order.activeMachine ? (
                      <span className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold animate-pulse">
                        ⚡ {order.activeMachine}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {order.assigned_to || <span className='text-red-500'>Unassigned</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      order.status === 'Dispatched' ? 'bg-emerald-100 text-emerald-700' : 
                      order.status === 'Ready for Dispatch' ? 'bg-cyan-100 text-cyan-700' : 
                      order.status === 'Coating Done' || order.status === 'Quality Done' ? 'bg-orange-100 text-orange-700' : 
                      order.status === 'Marking Done' ? 'bg-purple-100 text-purple-700' : 
                      order.status === 'At Coating' ? 'bg-pink-100 text-pink-700' : 
                      order.status === 'Production Done' ? 'bg-green-100 text-green-700' : 
                      order.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 
                      order.status === 'Planning Done' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      order.production_status === 'Finished' ? 'bg-green-100 text-green-700' : 
                      order.production_status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                      order.production_status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {order.production_status || 'Not Started'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-gray-400">
                    {order.created_on?.slice(0,10)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex gap-1 justify-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        View
                      </button>
                      {order.status === 'Ready for Dispatch' && (
                        <span className="px-2 py-1 bg-cyan-500 text-white rounded text-xs font-bold animate-pulse">
                          📤
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedOrder && (
        <WorkOrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} user={user} />
      )}
    </div>
  );
}
