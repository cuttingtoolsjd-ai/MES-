import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Tabs from '../../components/Tabs'
import Tile from '../../components/Tile'
import { useCallback } from 'react'
import EmployeeTable from '../../components/EmployeeTable'
import WorkOrderTable from '../../components/WorkOrderTable'
import WorkOrderOverview from '../../components/WorkOrderOverview'
import StockTable from '../../components/StockTable'
import StockTab from '../../components/StockTab'
import ToolMasterOverview from '../../components/ToolMasterOverview'
import FactoryLayout from '../../components/FactoryLayout2'
import WorkOrderTransfersTab from '../../components/WorkOrderTransfersTab'
import CompletedWorkOrdersTab from '../../components/CompletedWorkOrdersTab'
import MachineIdleGraph from '../../components/MachineIdleGraph'
import MachineEfficiencyGraph from '../../components/MachineEfficiencyGraph'
import MachineSettingsTable from '../../components/MachineSettingsTable'
import ForcePasswordChangeModal from '../../components/ForcePasswordChangeModal'
import Link from 'next/link'

// --- DispatchTab component ---
function DispatchTab({ user }) {
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

export default function AdminDashboard() {
  // ...existing code...
  const [showMachineSettings, setShowMachineSettings] = useState(false);
  const [user, setUser] = useState(null)
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false)
  // Planner controls (Day/Shift) shown above the layout
  const SHIFT_OPTIONS = [
    { value: 'first', label: 'First Shift' },
    { value: 'second', label: 'Second Shift' },
    { value: 'night', label: 'Night Shift' },
  ]
  const getTodayStr = () => new Date().toISOString().slice(0, 10)
  const [planDay, setPlanDay] = useState(getTodayStr())
  const [planShift, setPlanShift] = useState(SHIFT_OPTIONS[0].value)
  const [tabIdx, setTabIdx] = useState(null) // null = show tiles, number = show tab content
  const [kpis, setKpis] = useState({ employees: 0, workOrders: 0, tools: 0, approvalsPending: 0, stockItems: 0 })

  const tileDefs = user ? [
    {
      title: 'Add Employee',
      description: 'Create and manage employee accounts',
      icon: '👤',
      accent: 'purple',
      kpi: kpis.employees,
      tab: 0,
    },
    {
      title: 'Work Orders',
      description: 'Create, edit, and track work orders',
      icon: '🗂️',
      accent: 'blue',
      kpi: kpis.workOrders,
      tab: 1,
    },
    {
      title: 'Tool Master',
      description: 'Catalog of tools with korv and times',
      icon: '🧰',
      accent: 'green',
      kpi: kpis.tools,
      tab: 2,
    },
    {
      title: 'Permission Requests',
      description: 'Approve or deny manager requests',
      icon: '✅',
      accent: 'orange',
      kpi: kpis.approvalsPending,
      tab: 3,
    },
    (user.role === 'admin' || user.role === 'manager') && {
      title: 'Stock & Inventory',
      description: 'Manage inventory and stock levels',
      icon: '📦',
      accent: 'pink',
      kpi: kpis.stockItems,
      tab: 4,
    },
    {
      title: 'Factory Planning',
      description: 'Plan, assign, and track machine capacity',
      icon: '🏭',
      accent: 'yellow',
      kpi: '',
      tab: 5,
    },
    (user.role === 'admin' || user.role === 'manager') && {
      title: 'Dispatch',
      description: 'Send to marking and complete dispatch',
      icon: '📤',
      accent: 'teal',
      kpi: '',
      tab: 7,
    },
  ].filter(Boolean) : []

  const handleTileClick = useCallback(idx => setTabIdx(idx), [])
  const handleBack = useCallback(() => setTabIdx(null), [])
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userMessage, setUserMessage] = useState('')
  const [userForm, setUserForm] = useState({ username: '', role: 'operator', assigned_machine: '' })
  const [userSubmitting, setUserSubmitting] = useState(false)

  const [workOrders, setWorkOrders] = useState([])
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(true)
  const [workOrderMessage, setWorkOrderMessage] = useState('')
  const [workOrderForm, setWorkOrderForm] = useState({
    work_order_no: '',
    drawing_no: '',
    customer_name: '',
    po_number: '',
    tool_code: '',
    tool_description: '',
    quantity: '',
    price: '',
    korv_per_unit: '',
    total_korv: '',
    total_price: '',
    machine: '',
    status: 'Created',
    assigned_to: '',
    created_by: '',
    coating_required: '', // 'yes' or 'no'
    coating_type: '',
    marking: ''
  })
  const [toolMaster, setToolMaster] = useState([])
  const [workOrderSubmitting, setWorkOrderSubmitting] = useState(false)
  const [toolLookup, setToolLookup] = useState({ found: false, loading: false, tool: null })
  // --- EDIT WORK ORDER ---
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editWorkOrder, setEditWorkOrder] = useState(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editMessage, setEditMessage] = useState('')
  // --- PERMISSION REQUESTS ---
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestMessage, setRequestMessage] = useState('');
  // --- TOOL MASTER ---
  async function fetchToolMaster() {
    try {
      const { data, error } = await supabase
        .from('tool_master')
        .select('*')
        .order('tool_code', { ascending: true })
      if (!error) setToolMaster(data || [])
    } catch {}
  }

  useEffect(() => {
    fetchToolMaster()
    fetchPermissionRequests()
  }, [])

  // --- PERMISSION REQUESTS ---
  async function fetchPermissionRequests() {
    setLoadingRequests(true)
    try {
      const { data, error } = await supabase
        .from('manager_permission_requests')
        .select('*')
        .order('requested_at', { ascending: false })
      if (error) {
        setRequestMessage('Error fetching requests: ' + error.message)
      } else {
        setPermissionRequests(data || [])
      }
    } catch (err) {
      setRequestMessage('Unexpected error: ' + err.message)
    } finally {
      setLoadingRequests(false)
    }
  }

  async function handleApproveRequest(requestId, action, toolCode) {
    try {
      if (action === 'delete') {
        // Delete the tool immediately
        const { error: delError } = await supabase
          .from('tool_master')
          .delete()
          .eq('tool_code', toolCode);
        if (delError) {
          setRequestMessage('Error deleting tool: ' + delError.message);
          return;
        }
        // Mark request as approved
        const { error: reqError } = await supabase
          .from('manager_permission_requests')
          .update({
            status: 'approved',
            reviewed_by: user.username,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', requestId);
        if (reqError) {
          setRequestMessage('Error updating request: ' + reqError.message);
        } else {
          setRequestMessage(`✅ Tool ${toolCode} deleted and request approved.`);
          fetchPermissionRequests();
          setTimeout(() => setRequestMessage(''), 3000);
        }
      } else if (action === 'edit') {
        // Fetch the request to see if it contains tool_data (manager's submitted edit)
        const { data: reqData, error: reqFetchError } = await supabase
          .from('manager_permission_requests')
          .select('*')
          .eq('id', requestId)
          .maybeSingle();
        if (reqFetchError) {
          setRequestMessage('Error fetching request: ' + reqFetchError.message);
          return;
        }
        if (reqData && reqData.tool_data) {
          // This is a manager's submitted edit, apply it to tool_master
          const toolData = reqData.tool_data;
          const computedKorv = ((parseFloat(toolData.cnc_time || 0) + parseFloat(toolData.cylindrical_time || 0) + parseFloat(toolData.tc_time || toolData.tc_estimated || 0)) / 5).toFixed(2)
          const { error: updateError } = await supabase
            .from('tool_master')
            .update({
              tool_description: toolData.tool_description,
              standard_korv: parseFloat(computedKorv),
              cnc_time: toolData.cnc_time ? parseFloat(toolData.cnc_time) : 0,
              cylindrical_time: toolData.cylindrical_time ? parseFloat(toolData.cylindrical_time) : 0,
              tc_time: toolData.tc_time ? parseFloat(toolData.tc_time) : (toolData.tc_estimated ? parseFloat(toolData.tc_estimated) : 0),
              organisational_korv: toolData.organisational_korv ? parseFloat(toolData.organisational_korv) : null,
              last_updated: new Date().toISOString()
            })
            .eq('tool_code', toolCode);
          if (updateError) {
            setRequestMessage('Error applying manager edit: ' + updateError.message);
            return;
          }
          // Mark request as approved
          const { error: reqError } = await supabase
            .from('manager_permission_requests')
            .update({
              status: 'approved',
              reviewed_by: user.username,
              reviewed_at: new Date().toISOString()
            })
            .eq('id', requestId);
          if (reqError) {
            setRequestMessage('Error updating request: ' + reqError.message);
          } else {
            setRequestMessage(`✅ Manager's edit applied and request approved for tool ${toolCode}.`);
            fetchPermissionRequests();
            setTimeout(() => setRequestMessage(''), 3000);
          }
        } else {
          // First approval: allow manager to edit
          const { error } = await supabase
            .from('manager_permission_requests')
            .update({
              status: 'approved',
              reviewed_by: user.username,
              reviewed_at: new Date().toISOString()
            })
            .eq('id', requestId);
          if (error) {
            setRequestMessage('Error approving request: ' + error.message);
          } else {
            setRequestMessage(`✅ Edit request approved! Manager can now edit tool ${toolCode}.`);
            fetchPermissionRequests();
            setTimeout(() => setRequestMessage(''), 3000);
          }
        }
      }
    } catch (err) {
      setRequestMessage('Unexpected error: ' + err.message);
    }
  }

  async function handleDenyRequest(requestId, adminNotes = '') {
    try {
      const { error } = await supabase
        .from('manager_permission_requests')
        .update({
          status: 'denied',
          reviewed_by: user.username,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', requestId)
      if (error) {
        setRequestMessage('Error denying request: ' + error.message)
      } else {
        setRequestMessage('❌ Request denied.')
        fetchPermissionRequests()
        setTimeout(() => setRequestMessage(''), 3000)
      }
    } catch (err) {
      setRequestMessage('Unexpected error: ' + err.message)
    }
  }

  // --- WORK ORDER FORM ---
  function handleWorkOrderFormChange(e) {
    const { name, value } = e.target
    setWorkOrderForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'quantity') {
      if (toolLookup.found && toolLookup.tool) {
        setWorkOrderForm((prev) => ({
          ...prev,
          quantity: value,
          korv_per_unit: toolLookup.tool.standard_korv,
          total_korv: value ? (parseFloat(toolLookup.tool.standard_korv || 0) * parseFloat(value)).toString() : '',
          total_price: prev.price && value ? (parseFloat(prev.price) * parseFloat(value)).toString() : '',
        }))
      } else {
        setWorkOrderForm((prev) => ({
          ...prev,
          quantity: value,
          total_price: prev.price && value ? (parseFloat(prev.price) * parseFloat(value)).toString() : '',
        }))
      }
    }
    if (name === 'price') {
      setWorkOrderForm((prev) => ({
        ...prev,
        price: value,
        total_price: prev.quantity && value ? (parseFloat(value) * parseFloat(prev.quantity)).toString() : '',
      }))
    }
  }

  async function handleToolCodeBlur() {
    const code = (workOrderForm.tool_code || '').trim()
    if (!code) return
    setToolLookup({ found: false, loading: true, tool: null })
    const { data } = await supabase
      .from('tool_master')
      .select('*')
      .eq('tool_code', code)
      .maybeSingle()
    if (data) {
      setToolLookup({ found: true, loading: false, tool: data })
      setWorkOrderForm((prev) => ({
        ...prev,
        tool_description: data.tool_description,
        korv_per_unit: data.standard_korv,
        total_korv: prev.quantity ? (parseFloat(data.standard_korv || 0) * parseFloat(prev.quantity)).toString() : '',
      }))
    } else {
      setToolLookup({ found: false, loading: false, tool: null })
      setWorkOrderForm((prev) => ({
        ...prev,
        tool_description: '',
        korv_per_unit: '',
        total_korv: '',
      }))
    }
  }

  // --- EDIT WORK ORDER ---
  function handleEditWorkOrder(wo) {
    setEditWorkOrder({ ...wo })
    setEditMessage('')
    setEditModalOpen(true)
  }

  function handleEditFormChange(e) {
    const { name, value } = e.target
    setEditWorkOrder((prev) => ({ ...prev, [name]: value }))
    if (name === 'quantity') {
      setEditWorkOrder((prev) => ({
        ...prev,
        quantity: value,
        total_korv: prev.korv_per_unit && value ? (parseFloat(prev.korv_per_unit) * parseFloat(value)).toString() : '',
        total_price: prev.price && value ? (parseFloat(prev.price) * parseFloat(value)).toString() : '',
      }))
    }
    if (name === 'price') {
      setEditWorkOrder((prev) => ({
        ...prev,
        price: value,
        total_price: prev.quantity && value ? (parseFloat(value) * parseFloat(prev.quantity)).toString() : '',
      }))
    }
  }

  async function handleUpdateWorkOrder(e) {
    e.preventDefault()
    setEditSubmitting(true)
    setEditMessage('')
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({
          ...editWorkOrder,
          quantity: editWorkOrder.quantity ? parseInt(editWorkOrder.quantity) : null,
          price: editWorkOrder.price ? parseFloat(editWorkOrder.price) : null,
          total_price: editWorkOrder.total_price ? parseFloat(editWorkOrder.total_price) : null,
          total_korv: editWorkOrder.total_korv ? parseFloat(editWorkOrder.total_korv) : null,
          korv_per_unit: editWorkOrder.korv_per_unit ? parseFloat(editWorkOrder.korv_per_unit) : null,
        })
        .eq('id', editWorkOrder.id)
      if (error) {
        setEditMessage('Error updating work order: ' + error.message)
      } else {
        setEditMessage('✅ Work order updated!')
        fetchWorkOrders()
        setTimeout(() => {
          setEditModalOpen(false)
          setEditMessage('')
        }, 1200)
      }
    } catch (err) {
      setEditMessage('Unexpected error: ' + err.message)
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleAddWorkOrder(e) {
    e.preventDefault()
    setWorkOrderSubmitting(true)
    setWorkOrderMessage('')
    try {
      // If tool code is new, save to tool_master first
  if (!toolLookup.found && workOrderForm.tool_code) {
        // Auto-calculate korv per unit from times (1 korv = 5 min)
        const standardKorv = ((parseFloat(workOrderForm.cnc_time || 0) + parseFloat(workOrderForm.cylindrical_time || 0) + parseFloat(workOrderForm.tc_time || workOrderForm.tc_estimated || 0)) / 5).toFixed(2)
        let { error: toolError } = await supabase
          .from('tool_master')
          .insert([{ 
            tool_code: workOrderForm.tool_code, 
            tool_description: workOrderForm.tool_description, 
            standard_korv: parseFloat(standardKorv),
            cnc_time: workOrderForm.cnc_time ? parseFloat(workOrderForm.cnc_time) : 0,
            cylindrical_time: workOrderForm.cylindrical_time ? parseFloat(workOrderForm.cylindrical_time) : 0,
            tc_time: workOrderForm.tc_time ? parseFloat(workOrderForm.tc_time) : (workOrderForm.tc_estimated ? parseFloat(workOrderForm.tc_estimated) : 0),
            organisational_korv: workOrderForm.organisational_korv ? parseFloat(workOrderForm.organisational_korv) : null
          }])
        if (toolError) {
          setWorkOrderMessage('Error saving new tool: ' + toolError.message)
          setWorkOrderSubmitting(false)
          return
        }
      }
      // Now create work order
      const { error } = await supabase
        .from('work_orders')
        .insert([{
          ...workOrderForm,
          quantity: workOrderForm.quantity ? parseInt(workOrderForm.quantity) : null,
          price: workOrderForm.price ? parseFloat(workOrderForm.price) : null,
          total_price: workOrderForm.total_price ? parseFloat(workOrderForm.total_price) : null,
          total_korv: workOrderForm.total_korv ? parseFloat(workOrderForm.total_korv) : null,
          korv_per_unit: workOrderForm.korv_per_unit ? parseFloat(workOrderForm.korv_per_unit) : null,
          created_by: user.username,
          coating_required: workOrderForm.coating_required,
          coating_type: workOrderForm.coating_required === 'yes' ? workOrderForm.coating_type : null,
          marking: workOrderForm.marking,
        }])
      if (error) {
        setWorkOrderMessage('Error creating work order: ' + error.message)
      } else {
        setWorkOrderMessage('✅ Work order added!')
        setWorkOrderForm({
          work_order_no: '', drawing_no: '', customer_name: '', po_number: '', tool_code: '', tool_description: '', quantity: '', price: '', korv_per_unit: '', total_korv: '', total_price: '', machine: '', status: 'Created', assigned_to: '', created_by: '', coating_required: '', coating_type: '', marking: ''
        })
        fetchToolMaster()
        fetchWorkOrders()
        setTimeout(() => setWorkOrderMessage(''), 3000)
      }
    } catch (err) {
      setWorkOrderMessage('Unexpected error: ' + err.message)
    } finally {
      setWorkOrderSubmitting(false)
    }
  }

  const [stockItems, setStockItems] = useState([])
  const [loadingStock, setLoadingStock] = useState(true)
  const [stockMessage, setStockMessage] = useState('')
  const [stockForm, setStockForm] = useState({
    tool_code: '',
    tool_description: '',
    standard_korv: '',
    cnc_time: '',
    cylindrical_time: '',
  tc_time: '',
    organisational_korv: '',
    total_standard_korv: ''
  })
  const [stockSubmitting, setStockSubmitting] = useState(false)
  // --- STOCK FORM ---
  function handleStockFormChange(e) {
    const { name, value } = e.target
    setStockForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleAddOrUpdateStock(e) {
    e.preventDefault()
    setStockSubmitting(true)
    setStockMessage('')
    try {
      // Check if tool_code exists
      const { data: existing, error: fetchError } = await supabase
        .from('tool_master')
        .select('id')
        .eq('tool_code', stockForm.tool_code)
        .maybeSingle()
      if (fetchError) {
        setStockMessage('Error checking tool: ' + fetchError.message)
        setStockSubmitting(false)
        return
      }
      if (existing) {
        // Update
        const { error } = await supabase
          .from('tool_master')
          .update({
            tool_description: stockForm.tool_description,
            standard_korv: stockForm.standard_korv ? parseFloat(stockForm.standard_korv) : null,
            cnc_time: stockForm.cnc_time ? parseFloat(stockForm.cnc_time) : null,
            cylindrical_time: stockForm.cylindrical_time ? parseFloat(stockForm.cylindrical_time) : null,
            tc_time: stockForm.tc_time ? parseFloat(stockForm.tc_time) : null,
            organisational_korv: stockForm.organisational_korv ? parseFloat(stockForm.organisational_korv) : null,
            total_standard_korv: stockForm.total_standard_korv ? parseFloat(stockForm.total_standard_korv) : null,
            last_updated: new Date().toISOString()
          })
          .eq('id', existing.id)
        if (error) {
          setStockMessage('Error updating tool: ' + error.message)
        } else {
          setStockMessage('✅ Tool updated!')
          setStockForm({ tool_code: '', tool_description: '', standard_korv: '', cnc_time: '', cylindrical_time: '', tc_time: '', organisational_korv: '', total_standard_korv: '' })
          fetchStockItems()
          setTimeout(() => setStockMessage(''), 3000)
        }
      } else {
        // Insert
        const { error } = await supabase
          .from('tool_master')
          .insert([{
            tool_code: stockForm.tool_code,
            tool_description: stockForm.tool_description,
            standard_korv: stockForm.standard_korv ? parseFloat(stockForm.standard_korv) : null,
            cnc_time: stockForm.cnc_time ? parseFloat(stockForm.cnc_time) : null,
            cylindrical_time: stockForm.cylindrical_time ? parseFloat(stockForm.cylindrical_time) : null,
            tc_time: stockForm.tc_time ? parseFloat(stockForm.tc_time) : null,
            organisational_korv: stockForm.organisational_korv ? parseFloat(stockForm.organisational_korv) : null,
            total_standard_korv: stockForm.total_standard_korv ? parseFloat(stockForm.total_standard_korv) : null
          }])
        if (error) {
          setStockMessage('Error adding tool: ' + error.message)
        } else {
          setStockMessage('✅ Tool added!')
          setStockForm({ tool_code: '', tool_description: '', standard_korv: '', cnc_time: '', cylindrical_time: '', tc_time: '', organisational_korv: '', total_standard_korv: '' })
          fetchStockItems()
          setTimeout(() => setStockMessage(''), 3000)
        }
      }
    } catch (err) {
      setStockMessage('Unexpected error: ' + err.message)
    } finally {
      setStockSubmitting(false)
    }
  }

  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in and has admin role
    const currentUser = localStorage.getItem('currentUser')
    if (!currentUser) {
      router.push('/login')
      return
    }
    const parsed = JSON.parse(currentUser)
    const normalizedRole = String(parsed?.role || '').toLowerCase()
    const userData = { ...parsed, role: normalizedRole }
    // persist normalized role so other pages are consistent
    localStorage.setItem('currentUser', JSON.stringify(userData))
    if (userData.role !== 'admin') {
      router.push(`/dashboard/${userData.role}`)
      return
    }
    setUser(userData)
    
    // Check if password change is required
    if (userData.password_change_required) {
      setShowPasswordChangeModal(true)
    }
    
    fetchUsers()
    fetchWorkOrders()
    fetchStockItems()
    fetchKpis()
  }, [router])

  async function fetchKpis() {
    try {
      const [usersCountRes, workOrdersCountRes, toolsCountRes, approvalsCountRes, stockCountRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }),
        supabase.from('tool_master').select('*', { count: 'exact', head: true }),
        supabase.from('manager_permission_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('stock_items').select('*', { count: 'exact', head: true })
      ])
      setKpis({
        employees: usersCountRes.count || 0,
        workOrders: workOrdersCountRes.count || 0,
        tools: toolsCountRes.count || 0,
        approvalsPending: approvalsCountRes.count || 0,
        stockItems: stockCountRes.count || 0,
      })
    } catch (_) {
      // swallow
    }
  }

  // --- USERS ---
  async function fetchUsers() {
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, assigned_machine, active, created_at, updated_at, korv')
        .order('created_at', { ascending: false })
      if (error) {
        setUserMessage('Error fetching users: ' + error.message)
      } else {
        setUsers(data || [])
      }
    } catch (err) {
      setUserMessage('Unexpected error: ' + err.message)
    } finally {
      setLoadingUsers(false)
    }
  }

  async function handleAddUser(e) {
    e.preventDefault()
    if (!userForm.username.trim()) {
      setUserMessage('Username is required')
      return
    }
    setUserSubmitting(true)
    setUserMessage('')
    try {
      const { error } = await supabase
        .from('users')
        .insert([{
          username: userForm.username.trim(),
          role: userForm.role,
          assigned_machine: userForm.assigned_machine.trim() || null,
          pin: '000000',
         active: true,
         password_change_required: true
        }])
      if (error) {
        setUserMessage('Error creating user: ' + error.message)
      } else {
        setUserMessage('✅ Employee added successfully!')
        setUserForm({ username: '', role: 'operator', assigned_machine: '' })
        fetchUsers()
        setTimeout(() => setUserMessage(''), 3000)
      }
    } catch (err) {
      setUserMessage('Unexpected error: ' + err.message)
    } finally {
      setUserSubmitting(false)
    }
  }

  async function handleDeactivateUser(userId) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ active: false })
        .eq('id', userId)
      if (error) {
        setUserMessage('Error deactivating user: ' + error.message)
      } else {
        fetchUsers()
      }
    } catch (err) {
      setUserMessage('Unexpected error: ' + err.message)
    }
  }

  // --- REACTIVATE USER ---
  async function handleReactivateUser(userId) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ active: true })
        .eq('id', userId)
      if (error) {
        setUserMessage('Error reactivating user: ' + error.message)
      } else {
        fetchUsers()
      }
    } catch (err) {
      setUserMessage('Unexpected error: ' + err.message)
    }
  }

  // --- WORK ORDERS ---
  async function fetchWorkOrders() {
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

  // --- STOCK ---
  async function fetchStockItems() {
    setLoadingStock(true)
    try {
      const { data, error } = await supabase
        .from('tool_master')
        .select('*')
        .order('last_updated', { ascending: false })
      if (error) {
        setStockMessage('Error fetching stock: ' + error.message)
      } else {
        setStockItems(data || [])
      }
    } catch (err) {
      setStockMessage('Unexpected error: ' + err.message)
    } finally {
      setLoadingStock(false)
    }
  }

  function handleLogout() {
    // Record logout timestamp before clearing session
    const currentUser = localStorage.getItem('currentUser')
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser)
        supabase
          .from('users')
          .update({ last_logout: new Date().toISOString() })
          .eq('id', userData.id)
          .then(() => {
            localStorage.removeItem('currentUser')
            router.push('/login')
          })
      } catch {
        localStorage.removeItem('currentUser')
        router.push('/login')
      }
    } else {
      localStorage.removeItem('currentUser')
      router.push('/login')
    }
  }

  function handlePasswordChanged() {
    setShowPasswordChangeModal(false)
    // Update user state to reflect password change
    const updatedUser = { ...user, password_change_required: false }
    setUser(updatedUser)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // --- TABS ---
  const machineList = [
    'CNC 1', 'CNC 2', 'CNC 3', 'CNC 4', 'CNC 5', 'CNC 7',
    'T&C 1', 'T&C 2', 'OPG 1', 'CYLN 1', 'CYLN 2',
    'topwork', 'cpx', 'spironi', 'zoller'
  ];

  const tabs = [
    {
      label: 'Work Order Overview',
      content: <WorkOrderOverview user={user} />
    },
    {
      label: 'Add Employee',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Employee Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Employee</h2>
            {userMessage && (
              <div className={`mb-4 p-4 rounded-md ${
                userMessage.includes('✅') || userMessage.includes('successfully')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {userMessage}
              </div>
            )}
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  id="username"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  id="role"
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="operator">Operator</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label htmlFor="assigned_machine" className="block text-sm font-medium text-gray-700 mb-1">Assigned Machine (Optional)</label>
                <input
                  type="text"
                  id="assigned_machine"
                  value={userForm.assigned_machine}
                  onChange={(e) => setUserForm({ ...userForm, assigned_machine: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., CNC-001, Lathe-003"
                />
              </div>
              <button
                type="submit"
                disabled={userSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {userSubmitting ? 'Adding Employee...' : 'Add Employee'}
              </button>
            </form>
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> New employees will have a default PIN of <code className="bg-gray-200 px-1 rounded">000000</code>
              </p>
            </div>
          </div>
          {/* Employee Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">All Employees</h2>
            {loadingUsers ? (
              <div className="text-center py-4">Loading employees...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No employees found</div>
            ) : (
              <EmployeeTable users={users} onDeactivate={handleDeactivateUser} onReactivate={handleReactivateUser} />
            )}
            <div className="mt-4 text-center">
              <button
                onClick={fetchUsers}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                🔄 Refresh List
              </button>
            </div>
            </div>
          </div>
        )
      },
    {
      label: 'Work Orders',
      content: (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Work Orders</h2>
          <form onSubmit={handleAddWorkOrder} className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Order No</label>
              <input type="text" name="work_order_no" value={workOrderForm.work_order_no} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Drawing No</label>
              <input type="text" name="drawing_no" value={workOrderForm.drawing_no} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input type="text" name="customer_name" value={workOrderForm.customer_name} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
              <input type="text" name="po_number" value={workOrderForm.po_number} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tool Code</label>
              <input type="text" name="tool_code" value={workOrderForm.tool_code} onChange={handleWorkOrderFormChange} onBlur={handleToolCodeBlur} className="w-full px-3 py-2 border border-gray-300 rounded-md" required autoComplete="off" />
              {toolLookup.loading && <div className="text-xs text-gray-500 mt-1">Checking tool code...</div>}
              {toolLookup.found && <div className="text-xs text-green-600 mt-1">Tool found in catalog.</div>}
              {!toolLookup.found && workOrderForm.tool_code && !toolLookup.loading && <div className="text-xs text-yellow-600 mt-1">New tool code. Please fill details below.</div>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tool Description</label>
              <input type="text" name="tool_description" value={workOrderForm.tool_description} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" readOnly={toolLookup.found} />
            </div>
            {/* If tool not found, show extra fields for new tool */}
            {!toolLookup.found && workOrderForm.tool_code && !toolLookup.loading && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNC Time (min)</label>
                  <input type="number" name="cnc_time" value={workOrderForm.cnc_time || ''} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cylindrical Time (min)</label>
                  <input type="number" name="cylindrical_time" value={workOrderForm.cylindrical_time || ''} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TC Estimated</label>
                  <input type="number" name="tc_time" value={workOrderForm.tc_time || ''} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organisational Korv</label>
                  <input type="number" name="organisational_korv" value={workOrderForm.organisational_korv || ''} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Standard Korv</label>
                  <input type="number" name="korv_per_unit" value={workOrderForm.korv_per_unit || ''} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" name="quantity" value={workOrderForm.quantity} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input type="number" name="price" value={workOrderForm.price} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Korv per Unit</label>
              <input type="number" name="korv_per_unit" value={workOrderForm.korv_per_unit} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Korv</label>
              <input type="number" name="total_korv" value={workOrderForm.total_korv} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Price</label>
              <input type="number" name="total_price" value={workOrderForm.total_price} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
              <input type="text" name="machine" value={workOrderForm.machine} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <input type="text" name="assigned_to" value={workOrderForm.assigned_to} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            {/* Coating Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coating Required?</label>
              <select name="coating_required" value={workOrderForm.coating_required} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            {/* Coating Type (only if required) */}
            {workOrderForm.coating_required === 'yes' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coating Type</label>
                <input type="text" name="coating_type" value={workOrderForm.coating_type} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required={workOrderForm.coating_required === 'yes'} />
              </div>
            )}
            {/* Marking */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marking</label>
              <input type="text" name="marking" value={workOrderForm.marking} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={workOrderSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors">
                {workOrderSubmitting ? 'Adding Work Order...' : 'Add Work Order'}
              </button>
            </div>
            {workOrderMessage && (
              <div className={`md:col-span-2 mb-2 p-3 rounded-md ${workOrderMessage.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{workOrderMessage}</div>
            )}
          </form>
          {loadingWorkOrders ? (
            <div className="text-center py-4">Loading work orders...</div>
          ) : workOrders.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No work orders found</div>
          ) : (
            <WorkOrderTable workOrders={workOrders} onEdit={handleEditWorkOrder} />
          )}
          {/* Edit Work Order Modal */}
          {editModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black/30" onClick={() => setEditModalOpen(false)} />
              <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-auto p-6 z-10">
                <h3 className="text-lg font-semibold mb-4">Edit Work Order</h3>
                {editWorkOrder && (
                  <form onSubmit={handleUpdateWorkOrder} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Order No</label>
                      <input type="text" name="work_order_no" value={editWorkOrder.work_order_no || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Drawing No</label>
                      <input type="text" name="drawing_no" value={editWorkOrder.drawing_no || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                      <input type="text" name="customer_name" value={editWorkOrder.customer_name || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                      <input type="text" name="po_number" value={editWorkOrder.po_number || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tool Code</label>
                      <input type="text" name="tool_code" value={editWorkOrder.tool_code || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tool Description</label>
                      <input type="text" name="tool_description" value={editWorkOrder.tool_description || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input type="number" name="quantity" value={editWorkOrder.quantity || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="1" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <input type="number" name="price" value={editWorkOrder.price || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" step="0.01" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Time</label>
                      <input type="number" name="cycle_time" value={editWorkOrder.cycle_time || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" step="0.01" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Complexity</label>
                      <input type="number" name="complexity" value={editWorkOrder.complexity || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" step="0.01" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Korv per Unit</label>
                      <input type="number" name="korv_per_unit" value={editWorkOrder.korv_per_unit || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" step="0.01" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Korv</label>
                      <input type="number" name="total_korv" value={editWorkOrder.total_korv || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Price</label>
                      <input type="number" name="total_price" value={editWorkOrder.total_price || ''} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
                      <input type="text" name="machine" value={editWorkOrder.machine || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <input type="text" name="status" value={editWorkOrder.status || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                      <input type="text" name="assigned_to" value={editWorkOrder.assigned_to || ''} onChange={handleEditFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button type="submit" disabled={editSubmitting} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md">
                        {editSubmitting ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button" onClick={() => setEditModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md">Cancel</button>
                    </div>
                    {editMessage && (
                      <div className={`mt-2 p-2 rounded-md ${editMessage.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{editMessage}</div>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}
          <div className="mt-4 text-center">
            <button
              onClick={fetchWorkOrders}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              🔄 Refresh List
            </button>
          </div>
        </div>
      )
    },
    {
      label: 'Tool Master',
      content: (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Tool Master Overview</h2>
          <div className="mb-4">
            <ToolMasterOverview
              user={user}
              onMakeWorkorder={tool => {
                setWorkOrderForm(prev => ({
                  ...prev,
                  tool_code: tool.tool_code,
                  tool_description: tool.tool_description,
                  korv_per_unit: tool.standard_korv,
                  total_korv: '',
                  quantity: '',
                  price: '',
                  total_price: '',
                  drawing_no: '',
                  customer_name: '',
                  po_number: '',
                  cycle_time: tool.cnc_time || '',
                  complexity: '',
                  machine: '',
                  status: 'Created',
                  assigned_to: '',
                  created_by: user.username
                }));
                setTabIdx(1); // Switch to Work Orders tab
              }}
            />
          </div>
        </div>
      )
    },
    {
      label: 'Permission Requests',
      content: (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Manager Permission Requests</h2>
          {requestMessage && (
            <div className={`mb-4 p-4 rounded-md ${
              requestMessage.includes('✅') || requestMessage.includes('successfully')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {requestMessage}
            </div>
          )}
          {loadingRequests ? (
            <div className="text-center py-4">Loading requests...</div>
          ) : permissionRequests.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No permission requests found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tool Code</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested At</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {permissionRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{request.requested_by}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{request.tool_code}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          request.action === 'edit' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {request.action === 'edit' ? 'Edit' : 'Delete'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate" title={request.reason}>
                        {request.reason}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          request.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.requested_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {request.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveRequest(request.id, request.action, request.tool_code)}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDenyRequest(request.id)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Deny
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">
                            {request.status === 'approved' ? 'Approved' : 'Denied'} by {request.reviewed_by}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 text-center">
            <button
              onClick={fetchPermissionRequests}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              🔄 Refresh Requests
            </button>
          </div>
        </div>
      )
    },
    (user.role === 'admin' || user.role === 'manager') && {
      label: 'Stock & Inventory',
      content: <StockTab user={user} />
    },
    {
      label: 'Factory Planning',
      content: (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Factory Planning</h2>
          <p className="mb-4 text-gray-700">Assign work orders to machines and plan production schedules.</p>
          <div className="flex gap-4 items-right mb-6 w-full" style={{ justifyContent: 'left' }}>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Day</label>
              <input type="date" value={planDay} onChange={(e) => setPlanDay(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Shift</label>
              <select value={planShift} onChange={(e) => setPlanShift(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                {SHIFT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-gray-400 ml-4">(Browse different days and shifts to plan work)</div>
          </div>
          <div className="mt-8">
            <FactoryLayout selectedDay={planDay} selectedShift={planShift} />
          </div>
        </div>
      )
    },
    {
      label: 'WO Transfers',
      content: (
        <div className="bg-white rounded-lg shadow p-6">
          <WorkOrderTransfersTab />
        </div>
      )
    },
    (user.role === 'admin' || user.role === 'manager') && {
      label: 'Dispatch',
      content: <DispatchTab user={user} />
    },
    {
      label: 'Completed WOs',
      content: <CompletedWorkOrdersTab />
    }
  ].filter(Boolean)

  // Find the Factory Planning tab and inject the button/modal
  const factoryPlanningIdx = tabs.findIndex(tab => tab.label === 'Factory Planning');
  if (factoryPlanningIdx !== -1) {
    const origContent = tabs[factoryPlanningIdx].content;
    tabs[factoryPlanningIdx].content = (
      <>
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowMachineSettings(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 font-semibold"
          >
            Machine Settings
          </button>
        </div>
        {showMachineSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-2 p-4 relative animate-fadein max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowMachineSettings(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >&times;</button>
              <MachineSettingsTable />
            </div>
          </div>
        )}
        {origContent}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Force Password Change Modal */}
      {showPasswordChangeModal && (
        <ForcePasswordChangeModal 
          user={user} 
          onPasswordChanged={handlePasswordChanged}
        />
      )}
      
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome back, <span className="font-semibold">{user.username}</span></p>
            </div>
            <div className="flex gap-4 items-center">
              <Link href="/kpi-dashboard" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
                📊 KPI Dashboard
              </Link>
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tabIdx === null ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {tileDefs.map((tile, idx) => (
              <Tile
                key={tile.title}
                title={tile.title}
                description={tile.description}
                icon={tile.icon}
                accent={tile.accent}
                kpi={tile.kpi}
                onClick={() => handleTileClick(tile.tab)}
                size="standard"
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-0 sm:p-0 relative animate-fadein">
            <button
              onClick={handleBack}
              className="absolute left-0 top-0 m-4 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium shadow-sm border border-gray-300"
              style={{ zIndex: 10 }}
            >
              ← Back
            </button>
            <div className="pt-14 px-2 sm:px-6">
              <Tabs tabs={tabs} initial={0} active={tabIdx} onChange={setTabIdx} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}