import React from 'react'

export default function ModernCard({ title, actions, children, padding = 'p-5', className = '' }) {
  return (
    <div className={`relative rounded-xl bg-white/70 backdrop-blur shadow-sm ring-1 ring-slate-200/70 hover:shadow-md transition-shadow ${padding} ${className}`}>
      <div className="absolute inset-0 rounded-xl pointer-events-none bg-gradient-to-br from-white/60 via-white/40 to-white/20" />
      <div className="relative z-10 flex items-start justify-between mb-4">
        {title && (
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-slate-800">
            {title}
          </h2>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
