import { useState, useMemo } from 'react'

// Tabs component supports both uncontrolled (internal state) and controlled (active/onChange) usage
export default function Tabs({ tabs, initial = 0, active: activeProp, onChange }) {
  const isControlled = typeof activeProp === 'number' && typeof onChange === 'function'
  const [internalActive, setInternalActive] = useState(initial)
  const active = isControlled ? activeProp : internalActive
  const setActive = isControlled ? onChange : setInternalActive

  const safeActive = useMemo(() => {
    if (!Array.isArray(tabs) || tabs.length === 0) return 0
    return Math.min(Math.max(active || 0, 0), tabs.length - 1)
  }, [active, tabs])

  // Guard against undefined or null tabs
  if (!tabs || !Array.isArray(tabs) || tabs.length === 0) {
    return <div className="p-4 text-gray-500">No tabs available</div>
  }

  return (
    <div>
      <div className="flex border-b mb-6">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            className={`px-4 py-2 -mb-px font-medium border-b-2 transition-colors duration-150 ${
              safeActive === idx
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-blue-600'
            }`}
            onClick={() => setActive(idx)}
            type="button"
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs[safeActive] && tabs[safeActive].content}</div>
    </div>
  )
}
