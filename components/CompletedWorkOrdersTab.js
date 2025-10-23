import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function CompletedWorkOrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    async function fetchCompletedOrders() {
      setLoading(true);
      
      let query = supabase
        .from('work_orders')
        .select('*')
        .eq('status', 'Completed')
        .order('dispatched_at', { ascending: false });

      if (search) {
        query = query.ilike('work_order_no', `%${search}%`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching completed orders:', error);
      } else {
        setOrders(data || []);
      }
      
      setLoading(false);
    }

    fetchCompletedOrders();
  }, [search]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return '-';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    }
    return `${diffHours}h`;
  };

  return (
    <div className="p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📦 Completed Work Orders</h2>
        
        {/* Search Bar */}
        <div className="mb-4">
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
          <div className="text-center py-6 text-gray-400">No completed work orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-white rounded-lg">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">WO No.</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Tool Code</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Qty</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Created</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Factory Planning</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Production Done</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Marking Done</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Coating Done</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Dispatched</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Total Time</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map(order => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 font-semibold text-blue-700">{order.work_order_no}</td>
                    <td className="px-3 py-2 text-gray-600">{order.tool_code}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs max-w-xs truncate" title={order.tool_description}>
                      {order.tool_description}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">{order.quantity}</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">
                      {formatDate(order.created_on)}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">
                      {formatDate(order.factory_planning_at)}
                      {order.factory_planning_by && (
                        <div className="text-gray-400">by {order.factory_planning_by}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">
                      {formatDate(order.production_completed_at)}
                      {order.production_completed_by && (
                        <div className="text-gray-400">by {order.production_completed_by}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">
                      {order.marking ? (
                        <>
                          {formatDate(order.marking_completed_at)}
                          {order.marking_completed_by && (
                            <div className="text-gray-400">by {order.marking_completed_by}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">
                      {order.coating_required ? (
                        <>
                          {formatDate(order.coating_completed_at)}
                          {order.coating_completed_by && (
                            <div className="text-gray-400">by {order.coating_completed_by}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">
                      {formatDate(order.dispatched_at)}
                      {order.dispatched_by && (
                        <div className="text-gray-400">by {order.dispatched_by}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-xs font-semibold text-green-700">
                      {calculateDuration(order.created_on, order.dispatched_at)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail Modal */}
        {selectedOrder && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <div 
              className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Work Order Details</h2>
                    <div className="text-lg font-semibold text-blue-600">{selectedOrder.work_order_no}</div>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-500">Tool Code</div>
                    <div className="font-semibold">{selectedOrder.tool_code}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Quantity</div>
                    <div className="font-semibold">{selectedOrder.quantity}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-gray-500">Description</div>
                    <div className="font-semibold">{selectedOrder.tool_description}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Customer</div>
                    <div className="font-semibold">{selectedOrder.customer_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">PO Number</div>
                    <div className="font-semibold">{selectedOrder.po_number || '-'}</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">📝</div>
                      <div className="flex-1">
                        <div className="font-semibold">Created</div>
                        <div className="text-sm text-gray-600">{formatDate(selectedOrder.created_on)}</div>
                      </div>
                    </div>

                    {selectedOrder.factory_planning_at && (
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">🏭</div>
                        <div className="flex-1">
                          <div className="font-semibold">Factory Planning</div>
                          <div className="text-sm text-gray-600">{formatDate(selectedOrder.factory_planning_at)}</div>
                          {selectedOrder.factory_planning_by && (
                            <div className="text-xs text-gray-500">by {selectedOrder.factory_planning_by}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedOrder.production_completed_at && (
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">⚙️</div>
                        <div className="flex-1">
                          <div className="font-semibold">Production Completed</div>
                          <div className="text-sm text-gray-600">{formatDate(selectedOrder.production_completed_at)}</div>
                          {selectedOrder.production_completed_by && (
                            <div className="text-xs text-gray-500">by {selectedOrder.production_completed_by}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedOrder.marking_completed_at && (
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">🏷️</div>
                        <div className="flex-1">
                          <div className="font-semibold">Marking Completed</div>
                          <div className="text-sm text-gray-600">{formatDate(selectedOrder.marking_completed_at)}</div>
                          {selectedOrder.marking_completed_by && (
                            <div className="text-xs text-gray-500">by {selectedOrder.marking_completed_by}</div>
                          )}
                          {selectedOrder.marking_notes && (
                            <div className="text-xs text-gray-600 mt-1">📝 {selectedOrder.marking_notes}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedOrder.coating_completed_at && (
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">🎨</div>
                        <div className="flex-1">
                          <div className="font-semibold">Coating Completed</div>
                          <div className="text-sm text-gray-600">{formatDate(selectedOrder.coating_completed_at)}</div>
                          {selectedOrder.coating_completed_by && (
                            <div className="text-xs text-gray-500">by {selectedOrder.coating_completed_by}</div>
                          )}
                          {selectedOrder.coating_notes && (
                            <div className="text-xs text-gray-600 mt-1">📝 {selectedOrder.coating_notes}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedOrder.dispatched_at && (
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">🚚</div>
                        <div className="flex-1">
                          <div className="font-semibold">Dispatched</div>
                          <div className="text-sm text-gray-600">{formatDate(selectedOrder.dispatched_at)}</div>
                          {selectedOrder.dispatched_by && (
                            <div className="text-xs text-gray-500">by {selectedOrder.dispatched_by}</div>
                          )}
                          {selectedOrder.dispatch_notes && (
                            <div className="text-xs text-gray-600 mt-1">📝 {selectedOrder.dispatch_notes}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="text-sm font-semibold text-green-700">Total Duration</div>
                    <div className="text-lg font-bold text-green-900">
                      {calculateDuration(selectedOrder.created_on, selectedOrder.dispatched_at)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
