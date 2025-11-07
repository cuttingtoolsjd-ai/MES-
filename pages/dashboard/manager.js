import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Tabs from '../../components/Tabs'
import Tile from '../../components/Tile'
import FactoryLayout from '../../components/FactoryLayout2'
import WorkOrderOrderTab from '../../components/WorkOrderOrderTab'
import WorkOrderTransfersTab from '../../components/WorkOrderTransfersTab'
import ActiveWorkOrdersTab from '../../components/ActiveWorkOrdersTab'
// Removed old FactoryLayout import (use FactoryLayout2 only)
import { useCallback } from 'react'
import WorkOrderTable from '../../components/WorkOrderTable'
import StockTable from '../../components/StockTable'
import StockTab from '../../components/StockTab'
import ToolMasterOverview from '../../components/ToolMasterOverview'
import WorkOrderOverview from '../../components/WorkOrderOverview'
import ForcePasswordChangeModal from '../../components/ForcePasswordChangeModal'
import ChangePinModal from '../../components/ChangePinModal'
import MachineSettingsTable from '../../components/MachineSettingsTable'
import PlanningKanban from '../../components/PlanningKanban'
import UserMenu from '../../components/UserMenu'

export default function ManagerDashboard() {
  const [user, setUser] = useState(null)
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false)
  const [showChangePinModal, setShowChangePinModal] = useState(false)
  const [showMachineSettings, setShowMachineSettings] = useState(false)
  const [tabIdx, setTabIdx] = useState(null) // null = show tiles, number = show tab content
  // Planner controls
  const SHIFT_OPTIONS = [
     { value: 1, label: 'Shift 1 (7:00 AM - 3:00 PM)' },
     { value: 2, label: 'Shift 2 (3:00 PM - 11:00 PM)' },
     { value: 3, label: 'Shift 3 (11:00 PM - 7:00 AM)' },
  ]
  const getTodayStr = () => new Date().toISOString().slice(0, 10)
  const [planDay, setPlanDay] = useState(getTodayStr())
  const [planShift, setPlanShift] = useState(SHIFT_OPTIONS[0].value)
  const [workOrders, setWorkOrders] = useState([])
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(true)
  const [workOrderMessage, setWorkOrderMessage] = useState('')
  const [workOrderForm, setWorkOrderForm] = useState({
    work_order_no: '',
    drawing_no: '',
    customer_name: '',
    tool_code: '',
    tool_description: '',
    quantity: '',
    price_per_unit: '',
    total_price: '',
    total_korv: '',
    status: 'Created',
    assigned_to: '',
    created_by: '',
    created_on: '',
    coating_required: '', // 'yes' or 'no'
    coating_type: '',
    marking: ''
  })
  const [toolLookup, setToolLookup] = useState({ found: false, loading: false, tool: null })
  const [workOrderSubmitting, setWorkOrderSubmitting] = useState(false)
  const [toolMaster, setToolMaster] = useState([])
  const [stockItems, setStockItems] = useState([])
  const [loadingStock, setLoadingStock] = useState(true)
  const [stockMessage, setStockMessage] = useState('')
  const [kpis, setKpis] = useState({ tools: 0, workOrders: 0, stockItems: 0 })
  const [maintenanceMachines, setMaintenanceMachines] = useState([])
  const [showWOOverview, setShowWOOverview] = useState(false)

  const tileDefs = [
    {
      title: 'Tool Master',
      description: 'Browse and request edits/deletes',
      icon: '🧰',
      accent: 'green',
      kpi: kpis.tools,
      tab: 0,
    },
    {
      title: 'Work Orders',
      description: 'Create and track work orders',
      icon: '🗂️',
      accent: 'blue',
      kpi: kpis.workOrders,
      tab: 1,
    },
    {
      title: 'Work Order Overview',
      description: 'View all work orders and status',
      icon: '📋',
      accent: 'amber',
      kpi: '',
      tab: 2,
    },
    {
      title: 'Stock & Inventory',
      description: 'Manage inventory & stock levels',
      icon: '📦',
      accent: 'pink',
      kpi: kpis.stockItems,
      tab: 3,
    },
    {
      title: 'Planning Kanban',
      description: 'Drag & drop planning board',
      icon: '🎮',
      accent: 'purple',
      kpi: '',
      tab: 4,
    },
    {
      title: 'Factory Layout',
      description: 'Machine assignments view',
      icon: '🏭',
      accent: 'yellow',
      kpi: maintenanceMachines.length ? `Maint: ${maintenanceMachines.length}` : '',
      tab: 5,
    },
  ]

  const handleTileClick = useCallback(idx => setTabIdx(idx), [])
  const handleBack = useCallback(() => setTabIdx(null), [])
  const router = useRouter()
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
  }, [])
  // --- WORK ORDER FORM ---
  function handleWorkOrderFormChange(e) {
    const { name, value } = e.target
    setWorkOrderForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'quantity') {
      if (toolLookup.found && toolLookup.tool) {
        setWorkOrderForm((prev) => ({
          quantity: value,
          total_price: prev.price_per_unit && value ? (parseFloat(prev.price_per_unit) * parseFloat(value)).toString() : '',
        }))
      }
    }
    if (name === 'price_per_unit') {
      setWorkOrderForm((prev) => ({
        ...prev,
        price_per_unit: value,
        total_price: prev.quantity && value ? (parseFloat(value) * parseFloat(prev.quantity)).toString() : '',
      }))
    }
  }

  async function handleToolCodeBlur() {
    const code = workOrderForm.tool_code.trim()
    if (!code) return
    setToolLookup({ found: false, loading: true, tool: null })
    const { data, error } = await supabase
      .from('tool_master')
      .select('*')
      .eq('tool_code', code)
      .maybeSingle()
    if (data) {
      setToolLookup({ found: true, loading: false, tool: data })
      setWorkOrderForm((prev) => ({
        ...prev,
        tool_description: data.tool_description,
        standard_korv: data.standard_korv,
        total_korv: prev.quantity ? (parseFloat(data.standard_korv || 0) * parseFloat(prev.quantity)).toString() : '',
      }))
    } else {
      setToolLookup({ found: false, loading: false, tool: null })
      setWorkOrderForm((prev) => ({
        ...prev,
        tool_description: '',
        standard_korv: '',
        total_korv: '',
      }))
    }
  }

  async function handleAddWorkOrder(e) {
    e.preventDefault()
    setWorkOrderSubmitting(true)
    setWorkOrderMessage('')
    try {
  if (!toolLookup.found && workOrderForm.tool_code) {
        const standardKorv = ((parseFloat(workOrderForm.cnc_time || 0) + parseFloat(workOrderForm.cylindrical_time || 0) + parseFloat(workOrderForm.tc_time || workOrderForm.tc_estimated || 0)) / 5).toFixed(2)
        let { error: toolError } = await supabase
          .from('tool_master')
          .insert([{ tool_code: workOrderForm.tool_code, tool_description: workOrderForm.tool_description, standard_korv: parseFloat(standardKorv) }])
        if (toolError) {
          const msg = (toolError.message || '').toLowerCase()
          if (msg.includes('standard_korv')) {
            const { error: retryErr } = await supabase
              .from('tool_master')
              .insert([{ tool_code: workOrderForm.tool_code, tool_description: workOrderForm.tool_description }])
            if (retryErr) {
              setWorkOrderMessage('Error saving new tool: ' + retryErr.message)
              setWorkOrderSubmitting(false)
              return
            }
          } else {
            setWorkOrderMessage('Error saving new tool: ' + toolError.message)
            setWorkOrderSubmitting(false)
            return
          }
        }
      }
      const { error } = await supabase
        .from('work_orders')
        .insert([{
          work_order_no: workOrderForm.work_order_no,
          drawing_no: workOrderForm.drawing_no,
          customer_name: workOrderForm.customer_name,
          tool_code: workOrderForm.tool_code,
          tool_description: workOrderForm.tool_description,
          quantity: workOrderForm.quantity ? parseFloat(workOrderForm.quantity) : null,
          price_per_unit: workOrderForm.price_per_unit ? parseFloat(workOrderForm.price_per_unit) : null,
          total_price: workOrderForm.total_price ? parseFloat(workOrderForm.total_price) : null,
          total_korv: workOrderForm.total_korv ? parseFloat(workOrderForm.total_korv) : null,
          korv_per_unit: toolLookup.found && toolLookup.tool ? parseFloat(toolLookup.tool.standard_korv) : (workOrderForm.standard_korv ? parseFloat(workOrderForm.standard_korv) : null),
          status: workOrderForm.status,
          assigned_to: workOrderForm.assigned_to,
          created_by: user.username,
          coating_required: workOrderForm.coating_required,
          coating_type: workOrderForm.coating_required === 'yes' ? workOrderForm.coating_type : null,
          marking: workOrderForm.marking,
          // Don't include created_on - let database default handle it
        }])
      if (error) {
        setWorkOrderMessage('Error creating work order: ' + error.message)
      } else {
        setWorkOrderMessage('✅ Work order added!')
        setWorkOrderForm({
          work_order_no: '', drawing_no: '', customer_name: '', tool_code: '', tool_description: '', quantity: '', price_per_unit: '', total_price: '', total_korv: '', status: 'Created', assigned_to: '', created_by: '', created_on: '', coating_required: '', coating_type: '', marking: ''
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

  useEffect(() => {
    // Check if user is logged in and has manager role
    // Try multiple sources for auth data (localStorage → sessionStorage)
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
      
      // Check if password change is required
      if (userData.password_change_required) {
        setShowPasswordChangeModal(true)
      }
      
      fetchWorkOrders()
      fetchStockItems()
      fetchKpis()
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    }
  }, [router])

  async function fetchKpis() {
    try {
      const [toolsCountRes, woCountRes, stockCountRes] = await Promise.all([
        supabase.from('tool_master').select('*', { count: 'exact', head: true }),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }),
        supabase.from('stock_items').select('*', { count: 'exact', head: true })
      ])
      setKpis({
        tools: toolsCountRes.count || 0,
        workOrders: woCountRes.count || 0,
        stockItems: stockCountRes.count || 0,
      })
    } catch (_) {
      // noop
    }
  }
  
  // --- MAINTENANCE ---
  async function fetchMaintenanceMachines() {
    try {
      const { data, error } = await supabase
        .from('machine_settings')
        .select('machine_id')
        .eq('maintenance', true)
        .order('machine_id', { ascending: true })
      if (!error) setMaintenanceMachines((data || []).map(r => r.machine_id))
    } catch (_) {
      // noop
    }
  }
  fetchMaintenanceMachines()

  // (Removed duplicate tabs definition below; using the one further down.)

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
        .from('stock_items')
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

  const machineList = [
    'CNC 1', 'CNC 2', 'CNC 3', 'CNC 4', 'CNC 5', 'CNC 7',
    'T&C 1', 'T&C 2', 'OPG 1', 'CYLN 1', 'CYLN 2',
    'topwork', 'cpx', 'spironi', 'zoller'
  ];

  const tabs = [
    {
      label: 'Tool Master',
      content: (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Tool Master Overview</h2>
          <div className="mb-4">
            <ToolMasterOverview user={user} />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">T&C Time (min)</label>
                  <input type="number" name="tc_time" value={workOrderForm.tc_time || ''} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organisational Korv</label>
                  <input type="number" name="organisational_korv" value={workOrderForm.organisational_korv || ''} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Standard Korv</label>
                  <input type="number" name="standard_korv" value={workOrderForm.standard_korv || ''} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" min="0" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" name="quantity" value={workOrderForm.quantity} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit</label>
              <input type="number" name="price_per_unit" value={workOrderForm.price_per_unit} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Price</label>
              <input type="number" name="total_price" value={workOrderForm.total_price} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Korv</label>
              <input type="number" name="total_korv" value={workOrderForm.total_korv} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" />
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
            <WorkOrderTable workOrders={workOrders} />
          )}
          <div className="mt-4 text-center">
            <button
              onClick={fetchWorkOrders}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              🔄 Refresh List
            </button>
          </div>
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setShowWOOverview((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors"
            >
              {showWOOverview ? '✖ Hide Work Order Overview' : '📋 Work Order Overview'}
            </button>
          </div>
          {showWOOverview && (
            <div className="mt-4">
              <div className="bg-white rounded-lg shadow p-4">
                <WorkOrderOverview user={user} />
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      label: 'Stock & Inventory',
      content: <StockTab user={user} />
    },
    {
      label: 'Work Order Overview',
      content: <WorkOrderOverview user={user} />
    },
    {
      label: 'Planning Kanban',
      content: (
        <div>
          <PlanningKanban user={user} />
        </div>
      )
    },
    {
      label: 'Factory Layout',
      content: (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Factory Layout</h2>
          <p className="mb-4 text-gray-700">Click a machine to assign work orders and see korv stats.</p>
          <div className="flex gap-4 items-right mb-6 w-full" style={{ justifyContent: 'left' }}>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Day</label>
              <input type="date" value={planDay} onChange={(e)=>setPlanDay(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Shift</label>
              <select value={planShift} onChange={(e)=>setPlanShift(Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1 text-sm">
                {SHIFT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-gray-400 ml-4">(Browse different days and shifts to plan work)</div>
          </div>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Note:</strong> Shift 1 is also used as General shift (9:30 AM - 6:00 PM)
            </p>
          </div>
          <FactoryLayout selectedDay={planDay} selectedShift={planShift} />
        </div>
      )
    },
    {
      label: 'WO Order',
      content: (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Work Order Sequence</h2>
          <p className="mb-4 text-gray-700">Reorder work orders for each machine. Drag to rearrange and save the order. Operators will see this order live.</p>
          <WorkOrderOrderTab />
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
    {
      label: 'Active Work',
      content: (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Active Work Orders Monitor</h2>
          <p className="mb-4 text-gray-700">View what's currently being worked on and make emergency swaps when needed.</p>
          <ActiveWorkOrdersTab />
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Force Password Change Modal */}
      {showPasswordChangeModal && (
        <ForcePasswordChangeModal 
          user={user} 
          onPasswordChanged={handlePasswordChanged}
        />
      )}

      {/* Change PIN Modal */}
      {showChangePinModal && (
        <ChangePinModal 
          user={user} 
          onClose={() => setShowChangePinModal(false)}
          onSuccess={() => {
            setShowChangePinModal(false);
            alert('PIN changed successfully! Please use your new PIN on next login.');
          }}
        />
      )}
      
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3 w-2/5">
              <button 
                onClick={() => {
                  try {
                    const saved = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
                    const parsed = saved ? JSON.parse(saved) : null;
                    const rawRole = (parsed?.role || user?.role || '').toString();
                    const role = rawRole.trim().toLowerCase();
                    const allowed = ['admin','manager','operator'];
                    if (allowed.includes(role)) {
                      router.push(`/dashboard/${role}`);
                    } else if (role.includes('admin')) {
                      router.push('/dashboard/admin');
                    } else if (role.includes('manager')) {
                      router.push('/dashboard/manager');
                    } else if (role.includes('operator') || role.includes('worker')) {
                      router.push('/dashboard/operator');
                    } else {
                      router.push('/login');
                    }
                  } catch (e) {
                    router.push('/login');
                  }
                }}
                className="hover:opacity-80 transition-opacity flex-shrink-0 w-28 h-10 sm:w-40 sm:h-12 bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
                title="Home"
              >
                <img 
                  src="/logo.png" 
                  alt="JD Cutting Tools" 
                  className="w-full h-full object-contain"
                />
              </button>
              <div className="hidden sm:block">
                <p className="text-sm text-gray-600">Welcome back, <span className="font-semibold">{user.username}</span></p>
                <p className="text-xs text-gray-500">Manager Dashboard</p>
              </div>
            </div>
            <div className="w-3/5 flex justify-end">
              <UserMenu 
                user={user} 
                onChangePinClick={() => setShowChangePinModal(true)}
              />
            </div>
          </div>
        </div>
      </div>
      {maintenanceMachines.length > 0 && (
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mt-2 sm:mt-4">
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <div className="font-semibold text-sm sm:text-base">Maintenance alert</div>
              <div className="text-xs sm:text-sm">{maintenanceMachines.length} machine(s) under maintenance: {maintenanceMachines.join(', ')}</div>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {tabIdx === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-8">
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
                style={{ minHeight: 160 }}
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

        {/* Machine Settings Modal */}
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
      </div>
    </div>
  )
}