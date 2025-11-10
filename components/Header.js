import React from 'react'
import { User, Settings, Bell, Search } from 'lucide-react'

export default function Header({ user, onSettingsClick }) {
  function handleLogout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('currentUser');
      window.location.href = '/login';
    }
  }

  return (
    <div className="relative">
      {/* Animated background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 via-purple-900/10 to-pink-900/20 animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_70%)]" />

      {/* Glassmorphism header */}
      <div className="relative backdrop-blur-2xl bg-white/[0.02] border-b border-white/[0.08] shadow-2xl">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Left side - Logo and title */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
                  <img
                    src="/logo.png"
                    alt="JD Cutting Tools"
                    className="relative w-12 h-12 object-contain drop-shadow-2xl"
                  />
                </div>
                <div className="text-white">
                  <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/90 bg-clip-text text-transparent">
                    Manager Workspace
                  </h1>
                  <p className="text-white/50 text-sm font-medium -mt-1">
                    Plan capacity, manage WOs, tools and stock
                  </p>
                </div>
              </div>
            </div>

            {/* Center - Search bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl blur-sm" />
                <div className="relative flex items-center bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl px-4 py-3 hover:bg-white/[0.05] transition-all duration-200">
                  <Search className="w-5 h-5 text-white/40 mr-3" />
                  <input
                    type="text"
                    placeholder="Search workspaces, tools, orders..."
                    className="bg-transparent border-0 outline-none text-white/80 placeholder-white/40 text-sm w-full"
                  />
                  <div className="ml-3 px-2 py-1 bg-indigo-500/20 rounded-lg text-xs text-indigo-300 border border-indigo-500/30">
                    ⌘K
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - User info and actions */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="relative p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition-all duration-200 group">
                <Bell className="w-5 h-5 text-white/60 group-hover:text-white/80 transition-colors" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-slate-900" />
              </button>

              {/* User menu */}
              <div className="flex items-center gap-3 text-white/90 hover:text-white transition-colors cursor-pointer group">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center ring-2 ring-white/10 group-hover:ring-white/20 transition-all">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900" />
                </div>
                <div className="hidden lg:block">
                  <div className="text-sm font-semibold">{user?.username || 'Manager'}</div>
                  <div className="text-xs text-white/50 -mt-0.5">Manager</div>
                </div>
              </div>

              {/* Settings */}
              <button
                onClick={onSettingsClick}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 group"
              >
                <Settings className="w-5 h-5 text-white/60 group-hover:text-white/80 transition-colors" />
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-red-500/80 hover:bg-red-600 border border-red-700 text-white font-semibold transition-all duration-200 group ml-2"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle animated line */}
      <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent animate-pulse" />
    </div>
  )
}