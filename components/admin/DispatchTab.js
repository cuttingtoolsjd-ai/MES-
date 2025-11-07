import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function DispatchTab({ user }) {
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectedWO, setSelectedWO] = useState(null)
  const [markingNotes, setMarkingNotes] = useState('')
  const [dispatchNotes, setDispatchNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchDispatchWorkOrders()
  }, [])

  async function fetchDispatchWorkOrders() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .in('status', ['Quality Done', 'Coating Done', 'Ready for Dispatch', 'Marking Done'])
        .order('ready_for_dispatch_at', { ascending: false, nullsFirst: false })
      
      if (error) throw error
      setWorkOrders(data || [])
    } catch (err) {
      setMessage('Error loading work orders: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendToMarking(woId) {
    setProcessing(true)
    setMessage('')
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({
          marking_completed_at: new Date().toISOString(),
          marking_completed_by: user.username,
          marking_notes: markingNotes,
          status: 'Marking Done'
        })
        .eq('id', woId)
      
      if (error) throw error
      setMessage('✅ Work order sent to marking successfully!')
      setMarkingNotes('')
      setSelectedWO(null)
      fetchDispatchWorkOrders()
    } catch (err) {
      setMessage('❌ Error: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  async function handleMarkDispatchDone(woId) {
    setProcessing(true)
    setMessage('')
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({
          dispatched_at: new Date().toISOString(),
          dispatched_by: user.username,
          dispatch_notes: dispatchNotes,
          status: 'Dispatched',
          ready_for_dispatch_at: new Date().toISOString(),
          ready_for_dispatch_by: user.username
        })
        .eq('id', woId)
      
      if (error) throw error
      setMessage('✅ Work order dispatched successfully!')
      setDispatchNotes('')
      setSelectedWO(null)
      fetchDispatchWorkOrders()
    } catch (err) {
      setMessage('❌ Error: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dispatch Management</h2>
        <button
          onClick={fetchDispatchWorkOrders}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Refresh
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          message.includes('✅') 
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading work orders...</div>
      ) : workOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No work orders ready for dispatch
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WO No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workOrders.map((wo) => (
                <tr key={wo.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {wo.work_order_no}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {wo.tool_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {wo.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      wo.status === 'Ready for Dispatch' 
                        ? 'bg-green-100 text-green-800'
                        : wo.status === 'Marking Done'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {wo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {selectedWO === wo.id ? (
                      <div className="space-y-2">
                        {(wo.status === 'Quality Done' || wo.status === 'Coating Done') && (
                          <div>
                            <input
                              type="text"
                              placeholder="Marking notes (optional)"
                              value={markingNotes}
                              onChange={(e) => setMarkingNotes(e.target.value)}
                              className="px-2 py-1 border rounded text-sm w-full mb-2"
                            />
                            <button
                              onClick={() => handleSendToMarking(wo.id)}
                              disabled={processing}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 mr-2"
                            >
                              Send to Marking
                            </button>
                          </div>
                        )}
                        {(wo.status === 'Marking Done' || wo.status === 'Ready for Dispatch') && (
                          <div>
                            <input
                              type="text"
                              placeholder="Dispatch notes (optional)"
                              value={dispatchNotes}
                              onChange={(e) => setDispatchNotes(e.target.value)}
                              className="px-2 py-1 border rounded text-sm w-full mb-2"
                            />
                            <button
                              onClick={() => handleMarkDispatchDone(wo.id)}
                              disabled={processing}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300 mr-2"
                            >
                              Mark Dispatched
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setSelectedWO(null)
                            setMarkingNotes('')
                            setDispatchNotes('')
                          }}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedWO(wo.id)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        Process
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Dispatch Process Flow:</h3>
        <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
          <li><strong>Quality/Coating Done:</strong> Work orders arrive after production completion</li>
          <li><strong>Send to Marking:</strong> Click "Process" → "Send to Marking" to add marking details</li>
          <li><strong>Ready for Dispatch:</strong> Items automatically become ready after marking</li>
          <li><strong>Dispatch:</strong> Click "Process" → "Mark Dispatched" to complete the order</li>
          <li><strong>Completed:</strong> Dispatched orders move to "Completed WOs" tab</li>
        </ol>
        <div className="mt-3 p-2 bg-white rounded border border-blue-300">
          <p className="text-xs text-blue-700">
            💡 <strong>Tip:</strong> Work orders shown here are linked from the main overview. 
            When production marks items as "Quality Done" or "Coating Done", they appear here automatically.
          </p>
        </div>
      </div>
    </div>
  )
}
