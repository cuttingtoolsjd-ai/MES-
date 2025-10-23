import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'

export default function DevelopmentNav() {
  const router = useRouter()
  const [mobileView, setMobileView] = useState(false)
  
  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <>
      <div className="fixed top-0 right-0 bg-yellow-100 border border-yellow-300 p-2 m-2 rounded-md shadow-sm z-50">
        <div className="text-xs font-bold text-yellow-800 mb-1">Dev Tools:</div>
        <div className="flex flex-col space-y-1 text-xs">
          <Link href="/login" className="text-blue-600 hover:underline">Login</Link>
          <Link href="/dashboard/admin" className="text-purple-600 hover:underline">Admin</Link>
          <Link href="/dashboard/manager" className="text-blue-600 hover:underline">Manager</Link>
          <Link href="/dashboard/operator" className="text-green-600 hover:underline">Operator</Link>
          <button 
            onClick={() => setMobileView(!mobileView)}
            className={`text-left ${mobileView ? 'text-green-600 font-bold' : 'text-orange-600'} hover:underline`}
          >
            📱 {mobileView ? 'Mobile ON' : 'Mobile View'}
          </button>
        </div>
      </div>
      
      {/* Mobile View Simulator */}
      {mobileView && (
        <div className="fixed inset-0 bg-gray-900 z-40 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl border-8 border-gray-800" style={{ width: '375px', height: '667px', maxHeight: '90vh' }}>
            <div className="absolute top-0 left-0 right-0 h-6 bg-gray-800 rounded-t-2xl flex items-center justify-center">
              <div className="w-16 h-1 bg-gray-700 rounded-full"></div>
            </div>
            <button
              onClick={() => setMobileView(false)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center z-50 hover:bg-red-600"
            >
              ✕
            </button>
            <div className="h-full overflow-auto pt-6 pb-6">
              <iframe src={router.asPath} className="w-full h-full border-0" title="Mobile Preview" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}