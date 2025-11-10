import React from 'react'
import { motion } from 'framer-motion'

// ============================================================================
// CARDS & CONTAINERS
// ============================================================================

export function Card({ children, className = '', onClick, hover = true }) {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : {}}
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}
    >
      {children}
    </motion.div>
  )
}

export function GlassCard({ children, className = '', onClick }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 ${className}`}
    >
      {children}
    </motion.div>
  )
}

export function GradientCard({ children, className = '', gradient = 'from-indigo-600 to-purple-600' }) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-lg overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ============================================================================
// BUTTONS
// ============================================================================

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) {
  const baseClasses =
    'font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  }

  const variants = {
    primary:
      'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:scale-105',
    secondary:
      'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600',
    ghost: 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg',
    success: 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg',
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <span className="animate-spin">⟳</span>}
      {children}
    </motion.button>
  )
}

export function IconButton({ icon: Icon, onClick, variant = 'ghost', size = 'md', className = '' }) {
  const baseClasses = 'rounded-full p-2 transition-all duration-200'

  const variants = {
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400',
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${className}`}
    >
      <Icon className="w-5 h-5" />
    </motion.button>
  )
}

// ============================================================================
// BADGES & TAGS
// ============================================================================

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className = '',
}) {
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  const variants = {
    default:
      'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white',
    primary:
      'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    success:
      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    warning:
      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    danger:
      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    purple:
      'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {icon && <span>{icon}</span>}
      {children}
    </span>
  )
}

export function StatusBadge({ status, className = '' }) {
  const statuses = {
    active: { icon: '🟢', label: 'Active', color: 'success' },
    inactive: { icon: '⚫', label: 'Inactive', color: 'default' },
    pending: { icon: '🟡', label: 'Pending', color: 'warning' },
    completed: { icon: '✅', label: 'Completed', color: 'success' },
    failed: { icon: '❌', label: 'Failed', color: 'danger' },
    paused: { icon: '⏸️', label: 'Paused', color: 'warning' },
  }

  const s = statuses[status] || statuses.inactive

  return (
    <Badge variant={s.color} icon={s.icon} className={className}>
      {s.label}
    </Badge>
  )
}

// ============================================================================
// AVATARS
// ============================================================================

export function Avatar({
  src,
  alt = 'Avatar',
  initials = '?',
  size = 'md',
  status,
  className = '',
}) {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`${sizes[size]} rounded-full object-cover border-2 border-white dark:border-slate-900`}
        />
      ) : (
        <div
          className={`${sizes[size]} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center border-2 border-white dark:border-slate-900`}
        >
          {initials}
        </div>
      )}

      {status && (
        <div
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
            status === 'online'
              ? 'bg-green-500'
              : status === 'away'
              ? 'bg-yellow-500'
              : 'bg-slate-400'
          }`}
        />
      )}
    </div>
  )
}

// ============================================================================
// INPUT FIELDS
// ============================================================================

export function TextInput({
  label,
  placeholder,
  value,
  onChange,
  error,
  helpText,
  icon,
  type = 'text',
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            {icon}
          </div>
        )}

        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full px-4 py-2.5 rounded-lg border-2 transition-all duration-200 ${
            icon ? 'pl-12' : ''
          } ${
            error
              ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
              : 'border-slate-300 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400'
          } bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">{error}</p>
      )}

      {helpText && !error && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{helpText}</p>
      )}
    </div>
  )
}

export function TextArea({
  label,
  placeholder,
  value,
  onChange,
  error,
  rows = 4,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}

      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        disabled={disabled}
        className={`w-full px-4 py-2.5 rounded-lg border-2 transition-all duration-200 ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-slate-300 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400'
        } bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${className}`}
        {...props}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">{error}</p>
      )}
    </div>
  )
}

// ============================================================================
// MODALS & DIALOGS
// ============================================================================

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'md',
  isDanger = false,
}) {
  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl ${sizes[size]} w-full overflow-hidden`}
      >
        {/* Header */}
        {title && (
          <div
            className={`px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between ${
              isDanger
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
            }`}
          >
            <h3 className="text-lg font-bold">{title}</h3>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-2xl font-light leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4">{children}</div>

        {/* Actions */}
        {actions && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
            {actions}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// ALERTS & NOTIFICATIONS
// ============================================================================

export function Alert({
  type = 'info',
  title,
  message,
  onClose,
  dismissible = true,
  className = '',
}) {
  const types = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: '🔵',
      text: 'text-blue-800 dark:text-blue-300',
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: '✅',
      text: 'text-green-800 dark:text-green-300',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: '⚠️',
      text: 'text-yellow-800 dark:text-yellow-300',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: '❌',
      text: 'text-red-800 dark:text-red-300',
    },
  }

  const t = types[type]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border-2 ${t.bg} ${t.border} p-4 flex items-start gap-3 ${className}`}
    >
      <span className="text-xl flex-shrink-0">{t.icon}</span>
      <div className="flex-1">
        {title && <h3 className={`font-bold ${t.text} mb-1`}>{title}</h3>}
        {message && <p className={`text-sm ${t.text}`}>{message}</p>}
      </div>
      {dismissible && (
        <button
          onClick={onClose}
          className={`flex-shrink-0 text-2xl font-light leading-none opacity-60 hover:opacity-100 transition-opacity ${t.text}`}
        >
          ×
        </button>
      )}
    </motion.div>
  )
}

// ============================================================================
// SKELETON LOADERS
// ============================================================================

export function SkeletonLoader({ count = 1, lines = 3, className = '' }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className={`space-y-3 ${className}`}>
          {[...Array(lines)].map((_, j) => (
            <div
              key={j}
              className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse"
            />
          ))}
        </div>
      ))}
    </>
  )
}

// ============================================================================
// DIVIDERS & SPACERS
// ============================================================================

export function Divider({ className = '' }) {
  return (
    <div className={`border-t border-slate-200 dark:border-slate-700 ${className}`} />
  )
}

export function SectionTitle({ title, subtitle, className = '' }) {
  return (
    <div className={className}>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
      {subtitle && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{subtitle}</p>
      )}
    </div>
  )
}
