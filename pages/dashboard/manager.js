import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import ManagerWorkspace from '../../components/ManagerWorkspace'

export default function ManagerDashboard() {
  const [user, setUser] = useState(null)
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

  return <ManagerWorkspace user={user} />
}