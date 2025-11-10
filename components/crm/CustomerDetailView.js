import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function CustomerDetailView({ customer, onBack, user }) {
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalValue: 0,
    lastOrderDate: null,
    avgOrderValue: 0,
    mostOrderedTool: '',
    orderFrequency: 0
  })

  useEffect(() => {
    if (customer) {
      fetchCustomerData()
    }
  }, [customer])

  async function fetchCustomerData() {
    setLoading(true)
    try {
      // Fetch purchase orders for this customer
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_lines (
            tool_code,
            tool_description,
            quantity,
            price,
            korv_per_unit
          )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })

      if (poError) throw poError

      setPurchaseOrders(poData || [])

      // Calculate statistics
      if (poData && poData.length > 0) {
        const totalOrders = poData.length
        const totalValue = poData.reduce((sum, po) => sum + (po.total_price || 0), 0)
        const lastOrderDate = poData[0]?.created_at
        const avgOrderValue = totalValue / totalOrders

        // Calculate order frequency (orders per month)
        const dates = poData.map(po => new Date(po.created_at)).sort((a, b) => a - b)
        const firstOrder = dates[0]
        const lastOrder = dates[dates.length - 1]
        const monthsDiff = (lastOrder - firstOrder) / (1000 * 60 * 60 * 24 * 30)
        const orderFrequency = monthsDiff > 0 ? totalOrders / monthsDiff : totalOrders

        // Find most ordered tool
        const toolCounts = {}
        poData.forEach(po => {
          po.purchase_order_lines?.forEach(line => {
            toolCounts[line.tool_code] = (toolCounts[line.tool_code] || 0) + line.quantity
          })
        })
        const mostOrderedTool = Object.entries(toolCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'

        setStats({
          totalOrders,
          totalValue,
          lastOrderDate,
          avgOrderValue,
          mostOrderedTool,
          orderFrequency: Math.round(orderFrequency * 10) / 10 // Round to 1 decimal
        })
      }
    } catch (error) {
      console.error('Error fetching customer data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">Loading customer details...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Customer Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md"
          >
            ← Back to Customers
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Total Orders</div>
            <div className="text-2xl font-bold text-blue-900">{stats.totalOrders}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Total Value</div>
            <div className="text-2xl font-bold text-green-900">${stats.totalValue.toLocaleString()}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Avg Order Value</div>
            <div className="text-2xl font-bold text-purple-900">${stats.avgOrderValue.toLocaleString()}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-orange-600 font-medium">Orders/Month</div>
            <div className="text-2xl font-bold text-orange-900">{stats.orderFrequency}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 font-medium">Last Order Date</div>
            <div className="text-lg text-gray-900">
              {stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString() : 'Never'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 font-medium">Most Ordered Tool</div>
            <div className="text-lg text-gray-900">{stats.mostOrderedTool}</div>
          </div>
        </div>
      </div>

      {/* Purchase Orders History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Purchase Order History</h3>

        {purchaseOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No purchase orders found for this customer.</div>
        ) : (
          <div className="space-y-4">
            {purchaseOrders.map(po => (
              <div key={po.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <h4 className="text-lg font-semibold text-gray-900">PO: {po.po_number}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      po.status === 'completed' ? 'bg-green-100 text-green-800' :
                      po.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {po.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(po.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-sm text-gray-600">Order Date</div>
                    <div className="font-medium">{po.order_date ? new Date(po.order_date).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Expected Delivery</div>
                    <div className="font-medium">{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Value</div>
                    <div className="font-medium">${po.total_price?.toLocaleString() || 'N/A'}</div>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Order Items:</h5>
                  <div className="space-y-2">
                    {po.purchase_order_lines?.map((line, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                        <div className="flex-1">
                          <span className="font-medium">{line.tool_code}</span>
                          <span className="text-gray-600 ml-2">{line.tool_description}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span>Qty: {line.quantity}</span>
                          <span>Price: ${line.price?.toLocaleString()}</span>
                        </div>
                      </div>
                    )) || <div className="text-gray-500">No items found</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}