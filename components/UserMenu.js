import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

export default function UserMenu({ user, onChangePinClick, onMachineSettingsClick }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const router = useRouter()

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  function handleLogout() {
    // Record logout timestamp
    if (user && user.id) {
      supabase
        .from('users')
        .update({ last_logout: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {
          localStorage.removeItem('currentUser')
          router.push('/login')
        })
        .catch(() => {
          localStorage.removeItem('currentUser')
          router.push('/login')
        })
    } else {
      localStorage.removeItem('currentUser')
      router.push('/login')
    }
  }

  function handleChangePin() {
    setIsOpen(false)
    if (onChangePinClick) {
      onChangePinClick()
    }
  }

  function handleMachineSettings() {
    setIsOpen(false)
    if (onMachineSettingsClick) {
      onMachineSettingsClick()
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* User Menu Button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]"
      >
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-medium text-gray-900">Menu</div>
            <div className="text-xs text-gray-500 capitalize">{user?.role || 'Role'}</div>
          </div>
        </div>
        <svg
          className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[1000]">
          {/* User Info (Mobile) */}
          <div className="sm:hidden px-4 py-3 border-b border-gray-100">
            <div className="font-medium text-gray-900">{user?.username || 'User'}</div>
            <div className="text-sm text-gray-500 capitalize">{user?.role || 'Role'}</div>
          </div>

          {/* Admin: KPI Dashboard */}
          {user?.role === 'admin' && (
            <Link
              href="/kpi-dashboard"
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>KPI Dashboard</span>
            </Link>
          )}

          {/* Machine Settings (All Roles) */}
          {onMachineSettingsClick && (
            <button
              onClick={handleMachineSettings}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <span>Machine Settings</span>
            </button>
          )}

          {/* Change PIN */}
          {onChangePinClick && (
            <button
              onClick={handleChangePin}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span>Change PIN</span>
            </button>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100 my-2"></div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  )
}
