import React from 'react'

export default function ModernDashboardWrapper({ user, title, subtitle, icon, onLogoClick, rightContent, children, customerContext }) {
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
                <div className="flex items-center gap-2">
                  <div className="text-3xl">{icon || '🏭'}</div>
                  <div>
                    <div className="text-xs text-white/80 font-medium">JD Cutting Tools</div>
                    <div className="text-sm font-bold text-white tracking-wide">{user?.username || 'User'}</div>
                  </div>
                </div>
              </button>
              <div className="flex-1" />
              <div className="shrink-0">{rightContent}</div>
            </div>
            <div className="mt-5">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                <span>{icon}</span> {title}
              </h1>
              {subtitle && <p className="text-white/70 mt-2 text-sm sm:text-base">{subtitle}</p>}
            </div>
          </div>
        </div>
        {/* Decorative gradient line */}
        <div className="h-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// Reusable modern card component
export function ModernCard({ children, className = '', title, icon, action }) {
  return (
    <div className={`bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-6 sm:p-8 hover:shadow-xl hover:border-white/30 transition-all ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {icon && <span className="text-2xl">{icon}</span>}
            <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="text-white/90">{children}</div>
    </div>
  )
}

// Tile grid wrapper
export function TileGrid({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">{children}</div>
}

// Enhanced tile with premium styling
export function PremiumTile({ icon, title, description, kpi, onClick, accent = 'indigo' }) {
  const accentMap = {
    indigo: 'from-indigo-600 to-indigo-400',
    purple: 'from-purple-600 to-purple-400',
    pink: 'from-pink-600 to-pink-400',
    blue: 'from-blue-600 to-blue-400',
    green: 'from-green-600 to-green-400',
    yellow: 'from-yellow-600 to-yellow-400',
  }
  const gradient = accentMap[accent] || accentMap.indigo

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer"
    >
      <div className={`relative h-48 rounded-2xl bg-gradient-to-br ${gradient} shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col justify-between border border-white/20`}>
        <div>
          <div className="text-4xl mb-3">{icon}</div>
          <h3 className="text-lg sm:text-xl font-bold text-white">{title}</h3>
          <p className="text-sm text-white/80 mt-1">{description}</p>
        </div>
        {kpi && <div className="text-3xl font-bold text-white">{kpi}</div>}
        <div className="absolute inset-0 rounded-2xl bg-white/5 group-hover:bg-white/10 transition" />
      </div>
    </div>
  )
}
