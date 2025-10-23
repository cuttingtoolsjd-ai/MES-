import { useState } from 'react'

export default function WorkOrderTable({ workOrders, onEdit }) {
  const [search, setSearch] = useState('');
  const filtered = workOrders.filter(wo => {
    const q = search.toLowerCase();
    return (
      (wo.work_order_no && wo.work_order_no.toLowerCase().includes(q)) ||
      (wo.customer_name && wo.customer_name.toLowerCase().includes(q)) ||
      (wo.po_number && wo.po_number.toLowerCase().includes(q)) ||
      (wo.tool_code && wo.tool_code.toLowerCase().includes(q)) ||
      (wo.tool_description && wo.tool_description.toLowerCase().includes(q))
    );
  });
  return (
    <div className="overflow-x-auto mt-4">
      <div className="mb-2 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search work order, PO, customer, tool, ..."
          className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Order No</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drawing No</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tool Code</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tool Description</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Korv Total</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created On</th>
            {onEdit && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filtered.map((wo) => (
            <tr key={wo.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{wo.work_order_no}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{wo.drawing_no}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{wo.customer_name}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{wo.tool_code}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{wo.tool_description}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{wo.quantity}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{wo.price_per_unit}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{wo.total_price}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{wo.total_korv}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{wo.status}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{wo.assigned_to}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{wo.created_by}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{wo.created_on ? new Date(wo.created_on).toLocaleString() : ''}</td>
              {onEdit && (
                <td className="px-3 py-2 whitespace-nowrap text-sm">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => onEdit(wo)}
                  >
                    Edit
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
