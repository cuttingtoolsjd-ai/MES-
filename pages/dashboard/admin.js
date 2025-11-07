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
import DispatchTab from '../../components/admin/DispatchTab'
import EmployeeForm from '../../components/admin/EmployeeForm'
import PermissionRequestsTable from '../../components/admin/PermissionRequestsTable'
import UserMenu from '../../components/UserMenu'
import ChangePinModal from '../../components/ChangePinModal'
import Link from 'next/link'

export default function AdminDashboard() {
  // ...existing code...
  const [showMachineSettings, setShowMachineSettings] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [user, setUser] = useState(null)
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false)
  // Planner controls (Day/Shift) shown above the layout
  const SHIFT_OPTIONS = [
     { value: 1, label: 'Shift 1 (7:00 AM - 3:00 PM)' },
     { value: 2, label: 'Shift 2 (3:00 PM - 11:00 PM)' },
     { value: 3, label: 'Shift 3 (11:00 PM - 7:00 AM)' },
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
      title: 'Work Order Overview',
      description: 'View all work orders and status',
      icon: '📋',
      accent: 'amber',
      kpi: '',
      tab: 2,
    },
    {
      title: 'Tool Master',
      description: 'Catalog of tools with korv and times',
      icon: '🧰',
      accent: 'green',
      kpi: kpis.tools,
      tab: 3,
    },
    {
      title: 'Permission Requests',
      description: 'Approve or deny manager requests',
      icon: '✅',
      accent: 'orange',
      kpi: kpis.approvalsPending,
      tab: 4,
    },
    (user.role === 'admin' || user.role === 'manager') && {
      title: 'Stock & Inventory',
      description: 'Manage inventory and stock levels',
      icon: '📦',
      accent: 'pink',
      kpi: kpis.stockItems,
      tab: 5,
    },
    {
      title: 'Factory Planning',
      description: 'Plan, assign, and track machine capacity',
      icon: '🏭',
      accent: 'yellow',
      kpi: '',
      tab: 6,
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
    
    const isRegrindingWO = (workOrderForm.work_order_no || '').trim().toUpperCase().startsWith('RE')
    
    if (name === 'quantity') {
      // Check if this is a regrinding work order (RE prefix)
      if (toolLookup.found && toolLookup.tool && !isRegrindingWO) {
        // For WO prefix (including WO123_r), auto-calculate KORV from tool_master
        setWorkOrderForm((prev) => ({
          ...prev,
          quantity: value,
          korv_per_unit: toolLookup.tool.standard_korv,
          total_korv: value ? (parseFloat(toolLookup.tool.standard_korv || 0) * parseFloat(value)).toString() : '',
          total_price: prev.price && value ? (parseFloat(prev.price) * parseFloat(value)).toString() : '',
        }))
      } else {
        // For RE prefix, recalculate total_korv if korv_per_unit exists
        setWorkOrderForm((prev) => ({
          ...prev,
          quantity: value,
          total_korv: prev.korv_per_unit && value ? (parseFloat(prev.korv_per_unit) * parseFloat(value)).toString() : '',
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
    // For RE prefix WOs, when cnc_time changes, auto-calculate korv_per_unit (1 KORV = 5 min)
    if (name === 'cnc_time' && isRegrindingWO) {
      const korvPerUnit = value ? (parseFloat(value) / 5).toFixed(2) : ''
      setWorkOrderForm((prev) => ({
        ...prev,
        korv_per_unit: korvPerUnit,
        total_korv: korvPerUnit && prev.quantity ? (parseFloat(korvPerUnit) * parseFloat(prev.quantity)).toString() : '',
      }))
    }
    // For RE prefix WOs, when korv_per_unit changes manually, recalculate total_korv
    if (name === 'korv_per_unit') {
      setWorkOrderForm((prev) => ({
        ...prev,
        total_korv: value && prev.quantity ? (parseFloat(value) * parseFloat(prev.quantity)).toString() : '',
      }))
    }
  }

  async function handleToolCodeBlur() {
    const code = (workOrderForm.tool_code || '').trim()
    if (!code) return
    
    // Check if this is a regrinding work order (RE prefix)
    const isRegrindingWO = (workOrderForm.work_order_no || '').trim().toUpperCase().startsWith('RE')
    
    // For RE work orders, skip tool_master lookup - users set KORV manually
    if (isRegrindingWO) {
      setToolLookup({ found: false, loading: false, tool: null })
      // Try to find in regrinding table for autocomplete
      const { data: regrindData } = await supabase
        .from('regrinding')
        .select('*')
        .eq('tool_code', code)
        .maybeSingle()
      
      if (regrindData) {
        setWorkOrderForm((prev) => ({
          ...prev,
          tool_description: regrindData.tool_description || '',
          korv_per_unit: regrindData.standard_korv || '',
          total_korv: prev.quantity && regrindData.standard_korv 
            ? (parseFloat(regrindData.standard_korv) * parseFloat(prev.quantity)).toString() 
            : '',
        }))
      }
      return
    }
    
    // For WO work orders, use tool_master lookup
    setToolLookup({ found: false, loading: true, tool: null })
    const { data } = await supabase
      .from('tool_master')
      .select('*')
      .eq('tool_code', code)
      .maybeSingle()
    
    if (data) {
      setToolLookup({ found: true, loading: false, tool: data })
      // For WO prefix (including WO123_r), use locked tool_master KORV
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
      const isRegrindingWO = (workOrderForm.work_order_no || '').trim().toUpperCase().startsWith('RE')
      
      if (isRegrindingWO) {
        // For RE work orders: save to regrinding table (not tool_master)
        if (workOrderForm.tool_code && workOrderForm.korv_per_unit) {
          // Check if regrinding tool already exists
          const { data: existingRegrind } = await supabase
            .from('regrinding')
            .select('id')
            .eq('tool_code', workOrderForm.tool_code)
            .maybeSingle()
          
          if (existingRegrind) {
            // Update existing regrinding tool
            await supabase
              .from('regrinding')
              .update({
                tool_description: workOrderForm.tool_description || '',
                standard_korv: parseFloat(workOrderForm.korv_per_unit),
                cnc_time: workOrderForm.cnc_time ? parseFloat(workOrderForm.cnc_time) : 0,
                updated_at: new Date().toISOString(),
                updated_by: user.username
              })
              .eq('tool_code', workOrderForm.tool_code)
          } else {
            // Insert new regrinding tool
            await supabase
              .from('regrinding')
              .insert([{
                tool_code: workOrderForm.tool_code,
                tool_description: workOrderForm.tool_description || '',
                standard_korv: parseFloat(workOrderForm.korv_per_unit),
                cnc_time: workOrderForm.cnc_time ? parseFloat(workOrderForm.cnc_time) : 0,
                created_by: user.username
              }])
          }
        }
      } else {
        // For WO work orders: save to tool_master if new tool
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
      
      if (userData.role !== 'admin') {
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
      label: 'Add Employee',
      content: <EmployeeForm onUserCreated={fetchKpis} />
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
            {/* For RE work orders: Only show CNC Time and Korv fields */}
            {(workOrderForm.work_order_no || '').trim().toUpperCase().startsWith('RE') && workOrderForm.tool_code && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNC Time (min)
                    <span className="text-xs text-blue-600 ml-2">(1 KORV = 5 min)</span>
                  </label>
                  <input type="number" name="cnc_time" value={workOrderForm.cnc_time || ''} onChange={handleWorkOrderFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-blue-50" min="0" step="0.01" placeholder="Enter CNC time to auto-calculate KORV" />
                </div>
              </>
            )}
            {/* For WO work orders: Show all time fields if tool not found */}
            {!(workOrderForm.work_order_no || '').trim().toUpperCase().startsWith('RE') && !toolLookup.found && workOrderForm.tool_code && !toolLookup.loading && (
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Korv per Unit
                {(workOrderForm.work_order_no || '').trim().toUpperCase().startsWith('RE') && (
                  <span className="text-xs text-green-600 ml-2">(Auto-calculated from CNC time)</span>
                )}
              </label>
              <input 
                type="number" 
                name="korv_per_unit" 
                value={workOrderForm.korv_per_unit} 
                onChange={handleWorkOrderFormChange}
                readOnly={!(workOrderForm.work_order_no || '').trim().toUpperCase().startsWith('RE')}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  (workOrderForm.work_order_no || '').trim().toUpperCase().startsWith('RE') 
                    ? 'bg-green-50' 
                    : 'bg-gray-100'
                }`}
                placeholder={(workOrderForm.work_order_no || '').trim().toUpperCase().startsWith('RE') ? 'Auto-calculated' : ''}
              />
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
          <div className="mt-4 flex flex-col sm:flex-row sm:justify-between gap-3">
            <button
              onClick={fetchWorkOrders}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              🔄 Refresh List
            </button>
            <button
              type="button"
              onClick={() => setTabIdx(tabs.findIndex(t => t.label === 'Work Order Overview'))}
              className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              📋 Go to Overview
            </button>
          </div>
        </div>
      )
    },
    {
      label: 'Work Order Overview',
      content: <WorkOrderOverview user={user} />
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
      content: <PermissionRequestsTable user={user} />
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
              <select value={planShift} onChange={(e) => setPlanShift(Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1 text-sm">
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
                <p className="text-xs text-gray-500">Admin Dashboard</p>
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