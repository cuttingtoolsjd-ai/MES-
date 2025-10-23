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
      className={`tile rounded-2xl border border-black bg-white ${sizeMap[size] || sizeMap.standard} shadow-subtle hover:shadow-lg hover:scale-[1.03] transition-all duration-200 relative overflow-hidden aspect-square w-full h-full flex flex-col ${disabled ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
      onClick={onClick}
      aria-label={title}
    >
      <div className="relative z-10 flex items-start justify-between mb-2">
        <div className="flex flex-col gap-2">
          {IconComponent ? (
            <IconComponent className="lucide w-8 h-8" />
          ) : icon ? (
            <span className="lucide w-8 h-8 text-black">{icon}</span>
          ) : null}
          <h3 className="text-base sm:text-lg font-bold text-black font-sans">{title}</h3>
        </div>
        {typeof kpi !== 'undefined' && (
          <div className="text-2xl sm:text-3xl font-black text-black bg-white px-3 py-1 rounded-lg shadow-subtle border border-silver">
            {kpi}
          </div>
        )}
      </div>
      {description && (
        <p className="relative z-10 text-gray-400 mt-auto text-xs sm:text-sm leading-relaxed font-medium font-sans">{description}</p>
      )}
      <div className="relative z-10 text-xs sm:text-sm mt-2 text-black group-hover:underline flex items-center gap-1 font-semibold font-sans">
        Open <ArrowRight className="lucide w-4 h-4 group-hover:fill-black transition-all" aria-hidden />
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
