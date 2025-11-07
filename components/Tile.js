import Link from 'next/link'
import { User, Folder, Tool, CheckCircle, Box, Factory, ArrowRight } from 'lucide-react'

// Map string icon names to Lucide icons
const iconMap = {
  '👤': User,
  '🗂️': Folder,
  '🧰': Tool,
  '✅': CheckCircle,
  '📦': Box,
  '🏭': Factory,
}

export default function Tile({
  href,
  title,
  description,
  icon,
  kpi, // number | string
  accent = 'blue',
  size = 'standard',
  disabled,
  onClick,
}) {
  const sizeMap = {
    standard: 'p-6',
    wide: 'p-6 sm:col-span-2',
    tall: 'p-6 sm:row-span-2',
  }

  const IconComponent = iconMap[icon] || null

  // Accent color map -> gradient pairs
  const accentGradients = {
    blue: 'from-sky-500 via-indigo-500 to-blue-600',
    purple: 'from-fuchsia-500 via-purple-500 to-indigo-600',
    green: 'from-emerald-500 via-green-500 to-teal-600',
    amber: 'from-amber-400 via-orange-500 to-yellow-500',
    pink: 'from-pink-500 via-rose-500 to-fuchsia-600',
    teal: 'from-teal-500 via-cyan-500 to-sky-600',
    orange: 'from-orange-500 via-amber-500 to-yellow-500',
    yellow: 'from-yellow-400 via-amber-400 to-orange-500',
  }

  const gradient = accentGradients[accent] || accentGradients.blue

  const content = (
    <div
      className={`group tile rounded-xl sm:rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm ${sizeMap[size] || sizeMap.standard} shadow-[0_2px_4px_-2px_rgba(0,0,0,0.12),_0_4px_12px_-2px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_10px_-2px_rgba(0,0,0,0.2),_0_10px_25px_-2px_rgba(0,0,0,0.15)] hover:scale-[1.02] sm:hover:scale-[1.025] transition-all duration-300 relative overflow-hidden w-full h-full flex flex-col min-h-[140px] sm:min-h-[160px] ${disabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
      onClick={onClick}
      aria-label={title}
    >
      {/* Animated gradient aura */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}> 
        <div className={`absolute -inset-[2px] rounded-[inherit] bg-gradient-to-r ${gradient} animate-[pulse_6s_ease-in-out_infinite]`} />
      </div>
      {/* Soft inner light */}
      <div className="absolute inset-0 rounded-[inherit] bg-white/60 group-hover:bg-white/50 transition-colors" />
      {/* Glow ring on hover */}
      <div className="absolute inset-0 rounded-[inherit] ring-0 group-hover:ring-2 ring-white/60 transition-all duration-300" />
      <div className="relative z-10 flex items-start justify-between mb-2">
        <div className="flex flex-col gap-1 sm:gap-2">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white shadow-md shadow-black/20 w-fit`}> 
            {IconComponent ? (
              <IconComponent className="lucide w-5 h-5 sm:w-7 sm:h-7" />
            ) : icon ? (
              <span className="lucide w-6 h-6 sm:w-8 sm:h-8 text-white text-lg sm:text-2xl">{icon}</span>
            ) : null}
          </div>
          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 font-sans leading-tight tracking-tight">
            {title}
          </h3>
        </div>
        {typeof kpi !== 'undefined' && (
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 bg-white/70 backdrop-blur px-2 py-1 sm:px-3 rounded-lg shadow-inner border border-slate-200">
            {kpi}
          </div>
        )}
      </div>
      {description && (
        <p className="relative z-10 text-slate-500 mt-auto text-xs leading-snug sm:leading-relaxed font-medium font-sans line-clamp-2">
          {description}
        </p>
      )}
      <div className="relative z-10 text-[11px] mt-3 text-slate-700 group-hover:text-slate-900 flex items-center gap-1 font-semibold font-sans tracking-wide">
        <span className="inline-flex items-center gap-1">Open <ArrowRight className="lucide w-3 h-3 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>
      </div>
      {/* Subtle bottom gradient bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-[inherit] bg-gradient-to-r ${gradient} opacity-70 group-hover:opacity-100 transition-opacity`} />
    </div>
  )

  if (href && !disabled) {
    return (
      <Link href={href} legacyBehavior>
        <a className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl">{content}</a>
      </Link>
    )
  }
  return content
}
