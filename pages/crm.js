import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import CustomerTable from '../components/crm/CustomerTable'
import EnquiryBoard from '../components/crm/EnquiryBoard'
import CustomerDetailView from '../components/crm/CustomerDetailView'
import Header from '../components/Header'

export default function CRM() {
  const [user, setUser] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const router = useRouter()

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
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    }
  }, [router])

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
              <h1 className="text-3xl font-bold text-white">CRM</h1>
              <p className="text-white/60 mt-1">Manage your customers and orders</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/manager')}
              className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white/80 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              ← Back to Dashboard
            </button>
          </div>

          {selectedCustomer ? (
            <CustomerDetailView
              customer={selectedCustomer}
              onBack={() => setSelectedCustomer(null)}
              user={user}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8">
                <CustomerTable
                  user={user}
                  isManagerView={true}
                  onViewDetails={setSelectedCustomer}
                />
              </div>
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8">
                <EnquiryBoard user={user} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}