import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const STATUS_COLUMNS = [
  { id: 'Created', label: 'Created', color: 'bg-gray-100', textColor: 'text-gray-700', icon: '📝' },
  { id: 'Planned', label: 'Planned', color: 'bg-blue-100', textColor: 'text-blue-700', icon: '📋' },
  { id: 'In Progress', label: 'In Progress', color: 'bg-yellow-100', textColor: 'text-yellow-700', icon: '⚙️' },
  { id: 'Production Done', label: 'Production Done', color: 'bg-green-100', textColor: 'text-green-700', icon: '✅' },
  { id: 'Quality Check', label: 'Quality Check', color: 'bg-purple-100', textColor: 'text-purple-700', icon: '🔍' },
  { id: 'Quality Done', label: 'Quality Done', color: 'bg-indigo-100', textColor: 'text-indigo-700', icon: '✔️' },
  { id: 'Coating Required', label: 'Coating Required', color: 'bg-orange-100', textColor: 'text-orange-700', icon: '🎨' },
  { id: 'Coating Done', label: 'Coating Done', color: 'bg-pink-100', textColor: 'text-pink-700', icon: '🖌️' },
  { id: 'Marking Done', label: 'Marking Done', color: 'bg-teal-100', textColor: 'text-teal-700', icon: '✍️' },
  { id: 'Ready for Dispatch', label: 'Ready for Dispatch', color: 'bg-cyan-100', textColor: 'text-cyan-700', icon: '📦' },
  { id: 'Dispatched', label: 'Dispatched', color: 'bg-green-200', textColor: 'text-green-800', icon: '🚚' },
]

export default function PlanningKanban({ user }) {
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [draggedItem, setDraggedItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchWorkOrders()
    
    // Set up real-time subscription for work order updates
    const subscription = supabase
      .channel('work_orders_kanban')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'work_orders' },
        () => {
          fetchWorkOrders()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchWorkOrders() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .neq('status', 'Completed')
        .order('created_on', { ascending: false })
      
      if (error) throw error
      setWorkOrders(data || [])
    } catch (err) {
      setMessage('Error loading work orders: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(workOrderId, newStatus) {
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', workOrderId)
      
      if (error) throw error
      setMessage(`✅ Work order status updated to ${newStatus}`)
      fetchWorkOrders()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Error updating status: ' + err.message)
    }
  }

  function handleDragStart(e, workOrder) {
    setDraggedItem(workOrder)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e, targetStatus) {
    e.preventDefault()
    if (draggedItem && draggedItem.status !== targetStatus) {
      handleStatusChange(draggedItem.id, targetStatus)
    }
    setDraggedItem(null)
  }

  function getWorkOrdersByStatus(status) {
    let filtered = workOrders.filter(wo => wo.status === status)
    
    if (searchTerm) {
      filtered = filtered.filter(wo => 
        wo.work_order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.tool_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    return filtered
  }

  const filteredColumns = filterStatus === 'all' 
    ? STATUS_COLUMNS 
    : STATUS_COLUMNS.filter(col => col.id === filterStatus)

  return (
    <div className="h-full">
      {/* Header with search and filters */}
      <div className="mb-4 bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Planning Kanban Board</h2>
            <p className="text-sm text-gray-600">Drag work orders between columns to update their status</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search WO #, Tool, Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Stages</option>
              {STATUS_COLUMNS.map(col => (
                <option key={col.id} value={col.id}>{col.label}</option>
              ))}
            </select>
            
            <button
              onClick={fetchWorkOrders}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        
        {message && (
          <div className={`mt-3 p-3 rounded-md text-sm ${
            message.includes('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
          <div className="text-center">
            <div className="text-2xl mb-2">⏳</div>
            <div className="text-gray-600">Loading work orders...</div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {filteredColumns.map(column => {
              const columnWorkOrders = getWorkOrdersByStatus(column.id)
              
              return (
                <div
                  key={column.id}
                  className="flex-shrink-0 w-80"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  {/* Column Header */}
                  <div className={`${column.color} ${column.textColor} rounded-t-lg p-4 sticky top-0 z-10`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{column.icon}</span>
                        <div>
                          <h3 className="font-bold text-sm">{column.label}</h3>
                          <span className="text-xs opacity-75">{columnWorkOrders.length} items</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Column Content */}
                  <div className="bg-gray-50 rounded-b-lg p-3 min-h-[500px] space-y-3 border-2 border-t-0 border-gray-200">
                    {columnWorkOrders.length === 0 ? (
                      <div className="text-center text-gray-400 text-sm py-8">
                        No work orders
                      </div>
                    ) : (
                      columnWorkOrders.map(wo => (
                        <div
                          key={wo.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, wo)}
                          className="bg-white rounded-lg shadow-sm p-4 cursor-move hover:shadow-md transition-shadow border border-gray-200"
                        >
                          {/* WO Card Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="font-bold text-gray-900 text-sm">
                              WO #{wo.work_order_no}
                            </div>
                            <span className="text-xs text-gray-500">
                              {wo.quantity || 0} pcs
                            </span>
                          </div>
                          
                          {/* Tool Info */}
                          <div className="mb-2">
                            <div className="text-sm font-medium text-gray-700">
                              {wo.tool_code}
                            </div>
                            {wo.tool_description && (
                              <div className="text-xs text-gray-500 truncate" title={wo.tool_description}>
                                {wo.tool_description}
                              </div>
                            )}
                          </div>
                          
                          {/* Customer */}
                          {wo.customer_name && (
                            <div className="mb-2 text-xs text-gray-600">
                              👤 {wo.customer_name}
                            </div>
                          )}
                          
                          {/* Metadata */}
                          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                            <span>
                              {wo.total_korv ? `${wo.total_korv} korv` : 'No korv'}
                            </span>
                            {wo.coating_required === 'yes' && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                🎨 Coating
                              </span>
                            )}
                          </div>
                          
                          {/* Assigned Machine/Operator */}
                          {wo.machine && (
                            <div className="mt-2 text-xs text-gray-600">
                              🏭 {wo.machine}
                            </div>
                          )}
                          {wo.assigned_to && (
                            <div className="mt-1 text-xs text-gray-600">
                              👷 {wo.assigned_to}
                            </div>
                          )}
                          
                          {/* Created Date */}
                          <div className="mt-2 text-xs text-gray-400">
                            {new Date(wo.created_on).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-4 bg-white rounded-lg shadow p-4">
        <h3 className="font-bold text-gray-900 mb-3">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {STATUS_COLUMNS.map(col => {
            const count = getWorkOrdersByStatus(col.id).length
            return (
              <div key={col.id} className={`${col.color} ${col.textColor} rounded-lg p-3 text-center`}>
                <div className="text-2xl mb-1">{col.icon}</div>
                <div className="font-bold text-lg">{count}</div>
                <div className="text-xs opacity-75">{col.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
