import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function PurchaseOrdersTable() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function fetchPOs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, po_number, order_date, expected_delivery, status, created_at, customers:customer_id(name)')
      .order('created_at', { ascending: false })
    if (error) setMessage('Error: ' + error.message)
    else setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchPOs() }, [])

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Purchase Orders</h3>
        <button onClick={fetchPOs} className="text-sm text-indigo-600 hover:underline">Refresh</button>
      </div>
      {message && <div className="text-sm text-red-700 mb-2">{message}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500">No purchase orders yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50">
                <th className="p-2">PO Number</th>
                <th className="p-2">Customer</th>
                <th className="p-2">Order Date</th>
                <th className="p-2">Expected</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.po_number}</td>
                  <td className="p-2">{r.customers?.name || '-'}</td>
                  <td className="p-2">{r.order_date || '-'}</td>
                  <td className="p-2">{r.expected_delivery || '-'}</td>
                  <td className="p-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
