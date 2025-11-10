import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Header from './Header'
import ActionCard from './ActionCard'
import CustomerTable from './crm/CustomerTable'
import CustomerDetailView from './crm/CustomerDetailView'
import { Users, Package, TrendingUp, Settings, BarChart3, FileText, Wrench, ClipboardList, Warehouse, Factory, HandHeart } from 'lucide-react'

export default function ManagerWorkspace({ user }) {
  const [activeView, setActiveView] = useState('dashboard')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [kpis, setKpis] = useState({ tools: 0, workOrders: 0, stockItems: 0 })
  const [maintenanceMachines, setMaintenanceMachines] = useState([])
  const router = useRouter()

  useEffect(() => {
    fetchKpis()
    fetchMaintenanceMachines()
  }, [])

  const fetchKpis = async () => {
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
    } catch (error) {
      console.error('Error fetching KPIs:', error)
    }
  }

  const fetchMaintenanceMachines = async () => {
    try {
      const { data, error } = await supabase
        .from('machine_settings')
        .select('machine_id')
        .eq('maintenance', true)
        .order('machine_id', { ascending: true })
      if (!error) setMaintenanceMachines((data || []).map(r => r.machine_id))
    } catch (error) {
      console.error('Error fetching maintenance machines:', error)
    }
  }

  const tileDefs = [
    {
      title: 'Tool Master',
      description: 'Browse and request edits/deletes',
      icon: Wrench,
      value: kpis.tools.toString(),
      change: '+2',
      changeType: 'positive',
      color: 'from-green-500 to-emerald-500',
      route: '/tool-master'
    },
    {
      title: 'Work Orders',
      description: 'Create and track work orders',
      icon: ClipboardList,
      value: kpis.workOrders.toString(),
      change: '+5',
      changeType: 'positive',
      color: 'from-blue-500 to-cyan-500',
      route: '/work-orders'
    },
    {
      title: 'Work Order Overview',
      description: 'View all work orders and status',
      icon: FileText,
      value: '',
      change: 'Active',
      changeType: 'positive',
      color: 'from-amber-500 to-orange-500',
      route: '/work-order-overview'
    },
    {
      title: 'Stock & Inventory',
      description: 'Manage inventory & stock levels',
      icon: Warehouse,
      value: kpis.stockItems.toString(),
      change: '+1',
      changeType: 'positive',
      color: 'from-pink-500 to-rose-500',
      route: '/inventory'
    },
    {
      title: 'Factory Layout',
      description: 'Machine assignments view',
      icon: Factory,
      value: maintenanceMachines.length ? `Maint: ${maintenanceMachines.length}` : '',
      change: maintenanceMachines.length > 0 ? 'Alert' : 'Clear',
      changeType: maintenanceMachines.length > 0 ? 'warning' : 'positive',
      color: 'from-yellow-500 to-amber-500',
      route: '/factory-layout'
    },
    {
      title: 'CRM',
      description: 'Manage your customers and orders',
      icon: HandHeart,
      value: '',
      change: 'Active',
      changeType: 'positive',
      color: 'from-indigo-500 to-purple-500',
      route: '/crm'
    }
  ]

  const renderContent = () => {
    switch (activeView) {
      case 'customers':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Customer Management</h2>
              <button
                onClick={() => setActiveView('dashboard')}
                className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white/80 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                ← Back to Dashboard
              </button>
            </div>
            {selectedCustomer ? (
              <CustomerDetailView
                customerId={selectedCustomer}
                onBack={() => setSelectedCustomer(null)}
              />
            ) : (
              <CustomerTable
                isManagerView={true}
                onCustomerSelect={setSelectedCustomer}
              />
            )}
          </div>
        )

      case 'orders':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Work Orders</h2>
              <button
                onClick={() => setActiveView('dashboard')}
                className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white/80 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                ← Back to Dashboard
              </button>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8">
              <div className="text-center text-white/60">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Work Orders Module</h3>
                <p>Coming soon - Full work order management interface</p>
              </div>
            </div>
          </div>
        )

      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Analytics & Reports</h2>
              <button
                onClick={() => setActiveView('dashboard')}
                className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white/80 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                ← Back to Dashboard
              </button>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8">
              <div className="text-center text-white/60">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Analytics Dashboard</h3>
                <p>Coming soon - Advanced analytics and reporting tools</p>
              </div>
            </div>
          </div>
        )

      case 'approvals':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Pending Approvals</h2>
              <button
                onClick={() => setActiveView('dashboard')}
                className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white/80 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                ← Back to Dashboard
              </button>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8">
              <div className="text-center text-white/60">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Approval Queue</h3>
                <p>Coming soon - Manager approval workflow interface</p>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Manager Workspace</h2>
              <p className="text-white/60">Plan capacity, manage WOs, tools and stock</p>
            </div>

            {/* Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tileDefs.map((tile, index) => (
                <ActionCard
                  key={index}
                  title={tile.title}
                  value={tile.value}
                  change={tile.change}
                  changeType={tile.changeType}
                  icon={tile.icon}
                  color={tile.color}
                  onClick={() => router.push(tile.route)}
                />
              ))}
            </div>
          </div>
        )
    }
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
          {renderContent()}
        </div>
      </main>
    </div>
  )
}