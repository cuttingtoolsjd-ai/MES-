export default function StockTable({ stockItems }) {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tool Code</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Stock</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {stockItems.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.tool_code}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{item.description}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{item.location}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{item.quantity}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{item.min_stock}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{item.max_stock}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">{item.updated_at ? new Date(item.updated_at).toLocaleString() : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
