import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import WorkOrderTable from '../components/WorkOrderTable'
import ToolMasterOverview from '../components/ToolMasterOverview'
import Header from '../components/Header'

export default function WorkOrders() {
  const [user, setUser] = useState(null)
  const [workOrders, setWorkOrders] = useState([])
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(true)
  const [workOrderMessage, setWorkOrderMessage] = useState('')
  const [showWOOverview, setShowWOOverview] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [toolMaster, setToolMaster] = useState([])
  const [newWorkOrder, setNewWorkOrder] = useState({
    work_order_no: '',
    drawing_no: '',
    customer_name: '',
    po_number: '',
    tool_code: '',
    tool_description: '',
    quantity: '',
    price_per_unit: '',
    korv_per_unit: 0,
    cnc_time: '',
    cylindrical_time: '',
    tc_time: '',
    quality_time: ''
  })
  const router = useRouter()

  // Check if work order is RE type (requires manual time entry)
  const isREWorkOrder = newWorkOrder.work_order_no.toUpperCase().startsWith('RE')

  useEffect(() => {
    // Check if user is logged in and has manager role
    let currentUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser')

    if (!currentUser) {
      router.push('/login')
      return
    }

    try {
      const parsed = JSON.parse(currentUser)
      const normalizedRole = String(parsed?.role || '').toLowerCase()
      const userData = { ...parsed, role: normalizedRole }

      // Ensure both storage methods have the latest data
      localStorage.setItem('currentUser', JSON.stringify(userData))
      sessionStorage.setItem('currentUser', JSON.stringify(userData))

      if (userData.role !== 'manager') {
        router.push(`/dashboard/${userData.role}`)
        return
      }
      setUser(userData)
      fetchWorkOrders()
      fetchToolMaster()
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    }
  }, [router])

  const fetchWorkOrders = async () => {
    setLoadingWorkOrders(true)
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .order('created_on', { ascending: false })
      if (error) {
        setWorkOrderMessage('Error fetching work orders: ' + error.message)
      } else {
        setWorkOrders(data || [])
      }
    } catch (err) {
      setWorkOrderMessage('Unexpected error: ' + err.message)
    } finally {
      setLoadingWorkOrders(false)
    }
  }

  const fetchToolMaster = async () => {
    try {
      const { data, error } = await supabase
        .from('tool_master')
        .select('*')
        .order('tool_code')
      if (error) {
        console.error('Error fetching tool master:', error)
      } else {
        setToolMaster(data || [])
      }
    } catch (err) {
      console.error('Unexpected error fetching tool master:', err)
    }
  }

  const handleToolCodeChange = async (toolCode) => {
    // Try to find the tool in tool master
    const existingTool = toolMaster.find(tool => tool.tool_code === toolCode)
    
    if (existingTool && !isREWorkOrder) {
      // Auto-populate from tool master (only for non-RE work orders)
      setNewWorkOrder(prev => ({
        ...prev,
        tool_code: toolCode,
        tool_description: existingTool.tool_description || '',
        korv_per_unit: existingTool.korv_per_unit || 0
      }))
    } else {
      // New tool or RE work order - keep existing description
      setNewWorkOrder(prev => ({
        ...prev,
        tool_code: toolCode,
        korv_per_unit: isREWorkOrder ? calculateKorvFromTimes(prev) : 0
      }))
    }
  }

  // Calculate KORV based on cycle times (for RE work orders)
  const calculateKorvFromTimes = (workOrder = newWorkOrder) => {
    const cncTime = parseFloat(workOrder.cnc_time || 0)
    const cylindricalTime = parseFloat(workOrder.cylindrical_time || 0)
    const tcTime = parseFloat(workOrder.tc_time || 0)
    const qualityTime = parseFloat(workOrder.quality_time || 0)
    
    // KORV = (CNC Time + Cylindrical Time + T&C Time + Quality Time) / 5
    const totalTime = cncTime + cylindricalTime + tcTime + qualityTime
    return (totalTime / 5).toFixed(2)
  }

  // Handle cycle time changes for RE work orders
  const handleTimeChange = (field, value) => {
    const updatedWorkOrder = {
      ...newWorkOrder,
      [field]: value
    }
    
    // Recalculate KORV if it's an RE work order
    if (isREWorkOrder) {
      updatedWorkOrder.korv_per_unit = calculateKorvFromTimes(updatedWorkOrder)
    }
    
    setNewWorkOrder(updatedWorkOrder)
  }

  const handleAddWorkOrder = async (e) => {
    e.preventDefault()
    if (!user) return

    try {
      const totalPrice = parseFloat(newWorkOrder.quantity) * parseFloat(newWorkOrder.price_per_unit || 0)
      const { data, error } = await supabase
        .from('work_orders')
        .insert([{
          work_order_no: newWorkOrder.work_order_no,
          drawing_no: newWorkOrder.drawing_no,
          customer_name: newWorkOrder.customer_name,
          po_number: newWorkOrder.po_number,
          tool_code: newWorkOrder.tool_code,
          tool_description: newWorkOrder.tool_description,
          quantity: parseFloat(newWorkOrder.quantity),
          price_per_unit: parseFloat(newWorkOrder.price_per_unit || 0),
          total_price: totalPrice,
          korv_per_unit: parseFloat(newWorkOrder.korv_per_unit || 0),
          status: 'Created',
          created_by: user.username
        }])
        .select()

      if (error) {
        setWorkOrderMessage('Error creating work order: ' + error.message)
      } else {
        setWorkOrderMessage('✅ Work order created successfully!')
        setNewWorkOrder({
          work_order_no: '',
          drawing_no: '',
          customer_name: '',
          po_number: '',
          tool_code: '',
          tool_description: '',
          quantity: '',
          price_per_unit: '',
          korv_per_unit: 0,
          cnc_time: '',
          cylindrical_time: '',
          tc_time: '',
          quality_time: ''
        })
        setShowCreateForm(false)
        fetchWorkOrders()
      }
    } catch (err) {
      setWorkOrderMessage('Unexpected error: ' + err.message)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      <Header user={user} />

      <main className="relative z-10 pt-24 px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Work Orders</h1>
              <p className="text-white/60 mt-1">Create and track work orders</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/manager')}
              className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white/80 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              ← Back to Dashboard
            </button>
          </div>

          <div className="space-y-6">
            {/* Create Work Order Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-green-500/30 transition-all"
              >
                {showCreateForm ? '✖ Hide Create Form' : '➕ Generate Work Order'}
              </button>
            </div>

            {/* Create Work Order Form */}
            {showCreateForm && (
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8">
                <h2 className="text-xl font-semibold text-white mb-6">Generate New Work Order</h2>

                <form onSubmit={handleAddWorkOrder} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Work Order No *</label>
                      <input
                        type="text"
                        value={newWorkOrder.work_order_no}
                        onChange={(e) => setNewWorkOrder({...newWorkOrder, work_order_no: e.target.value})}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500/50"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Drawing No</label>
                      <input
                        type="text"
                        value={newWorkOrder.drawing_no}
                        onChange={(e) => setNewWorkOrder({...newWorkOrder, drawing_no: e.target.value})}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Customer Name *</label>
                      <input
                        type="text"
                        value={newWorkOrder.customer_name}
                        onChange={(e) => setNewWorkOrder({...newWorkOrder, customer_name: e.target.value})}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500/50"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">PO Number</label>
                      <input
                        type="text"
                        value={newWorkOrder.po_number}
                        onChange={(e) => setNewWorkOrder({...newWorkOrder, po_number: e.target.value})}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Tool Code *</label>
                      <input
                        type="text"
                        value={newWorkOrder.tool_code}
                        onChange={(e) => handleToolCodeChange(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500/50"
                        placeholder="Enter tool code (auto-fills if exists in tool master)"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Tool Description</label>
                      <input
                        type="text"
                        value={newWorkOrder.tool_description}
                        onChange={(e) => setNewWorkOrder({...newWorkOrder, tool_description: e.target.value})}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500/50"
                        placeholder="Enter tool description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Quantity *</label>
                      <input
                        type="number"
                        value={newWorkOrder.quantity}
                        onChange={(e) => setNewWorkOrder({...newWorkOrder, quantity: e.target.value})}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500/50"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Price per Unit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newWorkOrder.price_per_unit}
                        onChange={(e) => setNewWorkOrder({...newWorkOrder, price_per_unit: e.target.value})}
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>

                    {/* Show cycle time fields only for RE work orders */}
                    {isREWorkOrder && (
                      <>
                        <div className="col-span-full">
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                            <p className="text-sm text-blue-300">
                              <strong>ℹ️ RE Work Order:</strong> Please enter cycle times for each operation. KORV will be calculated automatically.
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-2">CNC Time (minutes)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newWorkOrder.cnc_time}
                            onChange={(e) => handleTimeChange('cnc_time', e.target.value)}
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500/50"
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-2">Cylindrical Time (minutes)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newWorkOrder.cylindrical_time}
                            onChange={(e) => handleTimeChange('cylindrical_time', e.target.value)}
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500/50"
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-2">T&C Time (minutes)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newWorkOrder.tc_time}
                            onChange={(e) => handleTimeChange('tc_time', e.target.value)}
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500/50"
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-2">Quality Time (minutes)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newWorkOrder.quality_time}
                            onChange={(e) => handleTimeChange('quality_time', e.target.value)}
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-indigo-500/50"
                            placeholder="0.00"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Korv per Unit {isREWorkOrder ? '(Auto-calculated from times)' : '(Auto-calculated)'}
                      </label>
                      <div className="w-full bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-300 font-semibold">
                        {newWorkOrder.korv_per_unit || 0} KORV
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-6 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white/80 hover:text-white hover:bg-white/[0.08] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                    >
                      Generate Work Order
                    </button>
                  </div>
                </form>

                {workOrderMessage && (
                  <div className={`mt-4 p-4 rounded-xl ${
                    workOrderMessage.includes('Error') || workOrderMessage.includes('Unexpected')
                      ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                      : 'bg-green-500/10 border border-green-500/20 text-green-300'
                  }`}>
                    {workOrderMessage}
                  </div>
                )}
              </div>
            )}

            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Work Orders</h2>

              {loadingWorkOrders ? (
                <div className="text-center py-4">
                  <div className="text-white/60">Loading work orders...</div>
                </div>
              ) : workOrders.length === 0 ? (
                <div className="text-center py-4 text-white/50">No work orders found</div>
              ) : (
                <WorkOrderTable workOrders={workOrders} />
              )}

              <div className="mt-4 text-center">
                <button
                  onClick={fetchWorkOrders}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                >
                  🔄 Refresh List
                </button>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setShowWOOverview(!showWOOverview)}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
              >
                {showWOOverview ? '✖ Hide Work Order Overview' : '📋 Show Work Order Overview'}
              </button>
            </div>

            {showWOOverview && (
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8">
                <WorkOrderOverview user={user} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}