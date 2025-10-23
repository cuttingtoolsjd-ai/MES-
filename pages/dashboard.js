import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser')
    if (!currentUser) {
      router.replace('/login')
      return
    }
    try {
      const user = JSON.parse(currentUser)
      const roleRaw = user?.role || 'operator'
      const role = String(roleRaw).toLowerCase()
      const allowed = ['admin', 'manager', 'operator']
      router.replace(`/dashboard/${allowed.includes(role) ? role : 'operator'}`)
    } catch (_) {
      router.replace('/login')
    }
  }, [router])

  return <div className="p-6">Redirecting…</div>
}