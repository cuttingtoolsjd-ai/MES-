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

  const content = (
    <div
      className={`tile rounded-xl sm:rounded-2xl border border-black bg-white ${sizeMap[size] || sizeMap.standard} shadow-subtle hover:shadow-lg hover:scale-[1.02] sm:hover:scale-[1.03] transition-all duration-200 relative overflow-hidden w-full h-full flex flex-col min-h-[140px] sm:min-h-[160px] ${disabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
      onClick={onClick}
      aria-label={title}
    >
      <div className="relative z-10 flex items-start justify-between mb-2">
        <div className="flex flex-col gap-1 sm:gap-2">
          {IconComponent ? (
            <IconComponent className="lucide w-6 h-6 sm:w-8 sm:h-8" />
          ) : icon ? (
            <span className="lucide w-6 h-6 sm:w-8 sm:h-8 text-black text-lg sm:text-2xl">{icon}</span>
          ) : null}
          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-black font-sans leading-tight">{title}</h3>
        </div>
        {typeof kpi !== 'undefined' && (
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-black bg-white px-2 py-1 sm:px-3 rounded-lg shadow-subtle border border-silver">
            {kpi}
          </div>
        )}
      </div>
      {description && (
        <p className="relative z-10 text-gray-400 mt-auto text-xs leading-snug sm:leading-relaxed font-medium font-sans line-clamp-2">{description}</p>
      )}
      <div className="relative z-10 text-xs mt-2 text-black group-hover:underline flex items-center gap-1 font-semibold font-sans">
        Open <ArrowRight className="lucide w-3 h-3 sm:w-4 sm:h-4 group-hover:fill-black transition-all" aria-hidden />
      </div>
    </div>
  )

  if (href && !disabled) {
    return (
      <Link href={href} legacyBehavior>
        <a>{content}</a>
      </Link>
    )
  }
  return content
}
