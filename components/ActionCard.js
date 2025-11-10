import React from 'react'
import { ArrowRight, TrendingUp } from 'lucide-react'

export default function ActionCard({
  title,
  value,
  change,
  changeType = 'positive',
  icon,
  color = 'from-indigo-500 to-purple-500',
  onClick
}) {
  const changeColors = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    warning: 'text-yellow-400',
    neutral: 'text-gray-400'
  }

  const changeIcons = {
    positive: '↗',
    negative: '↘',
    warning: '⚠',
    neutral: '→'
  }

  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl cursor-pointer transition-all duration-500 ease-out bg-white/[0.02] backdrop-blur-2xl border border-white/[0.08] hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-indigo-500/20 hover:scale-[1.02] hover:-translate-y-1 transform-gpu"
    >
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />

      {/* Subtle animated border glow */}
      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${color} opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500`} />

      {/* Floating particles effect */}
      <div className="absolute top-4 right-4 w-2 h-2 bg-indigo-400/30 rounded-full animate-ping group-hover:animate-pulse" />
      <div className="absolute bottom-6 left-6 w-1 h-1 bg-purple-400/40 rounded-full animate-pulse group-hover:animate-ping" />

      <div className="relative p-8">
        {/* Header with icon */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-white/[0.05] rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative w-16 h-16 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              {React.createElement(icon, { className: "w-8 h-8 text-white/70 group-hover:text-white transition-colors" })}
            </div>
          </div>

          {/* Change indicator */}
          <div className="text-right">
            <div className={`text-sm font-medium ${changeColors[changeType] || changeColors.positive}`}>
              {changeIcons[changeType] || changeIcons.positive} {change}
            </div>
          </div>
        </div>

        {/* Content */}
        <div>
          <div className="text-4xl font-bold text-white mb-2 group-hover:scale-105 transition-transform duration-300">
            {value}
          </div>
          <h3 className="text-lg font-semibold text-white/90 mb-1 group-hover:text-white transition-colors">
            {title}
          </h3>
        </div>
      </div>
    </div>
  )
}