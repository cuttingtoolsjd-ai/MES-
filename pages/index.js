import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Attempt to route to saved dashboard role if user info exists
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null
      if (saved) {
        const parsed = JSON.parse(saved)
        const rawRole = (parsed?.role || '').toString()
        const role = rawRole.trim().toLowerCase()
        const allowed = ['admin','manager','operator']
        if (allowed.includes(role)) {
          router.replace(`/dashboard/${role}`)
          return
        }
        // Fallback fuzzy matching
        if (role.includes('admin')) {
          router.replace('/dashboard/admin'); return
        }
        if (role.includes('manager')) {
          router.replace('/dashboard/manager'); return
        }
        if (role.includes('operator') || role.includes('worker')) {
          router.replace('/dashboard/operator'); return
        }
      }
    } catch (e) {
      // swallow, will go to login
    }
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-700">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-lg">Redirecting...</p>
      </div>
    </div>
  )
}
