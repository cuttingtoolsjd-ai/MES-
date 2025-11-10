import React from 'react'
import EnhancedChatDock from './EnhancedChatDock'

export default function DashboardLayout({
  user,
  title,
  subtitle,
  onLogoClick,
  rightContent,
  banner,
  children,
  customerContextId,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Premium Gradient Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 blur-3xl" />
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={onLogoClick}
                className="group flex items-center gap-3 focus:outline-none hover:opacity-80 transition"
                title="Home"
              >
                <img
                  src="/logo.png"
                  alt="JD Cutting Tools"
                  className="w-28 h-10 sm:w-40 sm:h-12 object-contain drop-shadow"
                />
                <div className="text-left text-white/90">
                  <div className="text-xs font-medium">Welcome</div>
                  <div className="text-sm font-bold tracking-wide">{user?.username || 'User'}</div>
                </div>
              </button>
              <div className="flex-1" />
              <div className="shrink-0">{rightContent}</div>
            </div>

            <div className="mt-5">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-white/70 mt-2 text-sm sm:text-base">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Decorative gradient line */}
        <div className="h-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
      </div>

      {/* Optional banner (alerts) */}
      {banner && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-6">
          {banner}
        </div>
      )}

      {/* Main content container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-6">
          {children}
        </div>
      </div>
      {user && <EnhancedChatDock user={user} customerContextId={customerContextId} />}
    </div>
  )
}
