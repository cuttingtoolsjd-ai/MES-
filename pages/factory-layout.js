import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import FactoryLayout from '../components/FactoryLayout2'
import Header from '../components/Header'

export default function FactoryLayoutPage() {
  const [user, setUser] = useState(null)
  const router = useRouter()

  // Planner controls
  const SHIFT_OPTIONS = [
    { value: 1, label: 'Shift 1 (7:00 AM - 3:00 PM)' },
    { value: 2, label: 'Shift 2 (3:00 PM - 11:00 PM)' },
    { value: 3, label: 'Shift 3 (11:00 PM - 7:00 AM)' },
  ]
  const getTodayStr = () => new Date().toISOString().slice(0, 10)
  const [planDay, setPlanDay] = useState(getTodayStr())
  const [planShift, setPlanShift] = useState(SHIFT_OPTIONS[0].value)

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
              <h1 className="text-3xl font-bold text-white">Factory Layout</h1>
              <p className="text-white/60 mt-1">Machine assignments view</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/manager')}
              className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white/80 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              ← Back to Dashboard
            </button>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8">
            <div className="mb-6">
              <p className="text-white/70 mb-4">Click a machine to assign work orders and see korv stats.</p>
              <div className="flex gap-4 items-center mb-6 w-full justify-start">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Day</label>
                  <input
                    type="date"
                    value={planDay}
                    onChange={(e) => setPlanDay(e.target.value)}
                    className="border border-white/[0.2] rounded px-3 py-2 text-white bg-white/[0.05] focus:border-white/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Shift</label>
                  <select
                    value={planShift}
                    onChange={(e) => setPlanShift(Number(e.target.value))}
                    className="border border-white/[0.2] rounded px-3 py-2 text-white bg-white/[0.05] focus:border-white/40 focus:outline-none"
                  >
                    {SHIFT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-slate-800 text-white">{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-white/40 ml-4">
                  (Browse different days and shifts to plan work)
                </div>
              </div>
              <div className="mb-4 p-3 bg-blue-50/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-300">
                  <strong>ℹ️ Note:</strong> Shift 1 is also used as General shift (9:30 AM - 6:00 PM)
                </p>
              </div>
            </div>
            <FactoryLayout selectedDay={planDay} selectedShift={planShift} />
          </div>
        </div>
      </main>
    </div>
  )
}