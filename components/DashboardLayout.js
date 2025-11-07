import React from 'react'

export default function DashboardLayout({
  user,
  title,
  subtitle,
  onLogoClick,
  rightContent,
  banner,
  children,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Gradient Header */}
      <div className="relative">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={onLogoClick}
                className="group flex items-center gap-3 focus:outline-none"
                title="Home"
              >
                <img
                  src="/logo.png"
                  alt="JD Cutting Tools"
                  className="w-28 h-10 sm:w-40 sm:h-12 object-contain drop-shadow"
                />
                <div className="hidden sm:block text-left text-white/90">
                  <div className="text-xs">Welcome{user?.username ? ',' : ''}</div>
                  <div className="text-sm font-semibold tracking-wide">{user?.username || 'User'}</div>
                </div>
              </button>
              <div className="flex-1" />
              <div className="shrink-0">{rightContent}</div>
            </div>

            <div className="mt-4 sm:mt-6">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-white/80 mt-1 text-sm sm:text-base">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Decorative bottom wave */}
        <div className="absolute inset-x-0 -bottom-6 sm:-bottom-8 h-6 sm:h-8 bg-gradient-to-b from-fuchsia-600/30 to-transparent blur-md" />
      </div>

      {/* Optional banner (alerts) */}
      {banner && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-4">
          {banner}
        </div>
      )}

      {/* Main card container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="bg-white/80 backdrop-blur rounded-xl sm:rounded-2xl shadow-lg ring-1 ring-black/5">
          {children}
        </div>
      </div>
    </div>
  )
}
