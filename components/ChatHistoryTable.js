import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'

// Icons
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const MessageBubbleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

// Room Badge Component
function RoomBadge({ room }) {
  let icon = '🌍'
  let label = 'Global'
  let color = 'from-blue-100 to-blue-50 text-blue-700 dark:from-blue-900/30 dark:to-blue-900/20 dark:text-blue-300'

  if (room.startsWith('dm:')) {
    icon = '💬'
    label = 'Direct Message'
    color = 'from-purple-100 to-purple-50 text-purple-700 dark:from-purple-900/30 dark:to-purple-900/20 dark:text-purple-300'
  } else if (room.startsWith('team:')) {
    icon = '👥'
    label = 'Team'
    color = 'from-indigo-100 to-indigo-50 text-indigo-700 dark:from-indigo-900/30 dark:to-indigo-900/20 dark:text-indigo-300'
  } else if (room.startsWith('customer:')) {
    icon = '📦'
    label = 'Customer'
    color = 'from-green-100 to-green-50 text-green-700 dark:from-green-900/30 dark:to-green-900/20 dark:text-green-300'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${color}`}>
      <span>{icon}</span>
      {label}
    </span>
  )
}

// Message Row Component
function MessageRow({ message, index, onExpand }) {
  const isOwn = message.isOwn
  const timestamp = new Date(message.created_at)
  const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = timestamp.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  // Truncate message
  const displayContent = message.content.length > 60 ? message.content.substring(0, 60) + '...' : message.content

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200"
    >
      {/* Message Content */}
      <td className="px-6 py-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isOwn ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
            <MessageBubbleIcon className={isOwn ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              {isOwn ? 'You' : message.sender}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate" title={message.content}>
              {displayContent}
            </p>
          </div>
        </div>
      </td>

      {/* Room */}
      <td className="px-6 py-4">
        <RoomBadge room={message.room_id} />
      </td>

      {/* Time */}
      <td className="px-6 py-4 text-right">
        <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">{timeStr}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{dateStr}</div>
      </td>

      {/* Action */}
      <td className="px-6 py-4 text-right">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onExpand(message)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium transition-colors duration-200"
        >
          View
          <ChevronRightIcon />
        </motion.button>
      </td>
    </motion.tr>
  )
}

// Modal for expanded message
function MessageModal({ message, isOpen, onClose }) {
  if (!isOpen || !message) return null

  const timestamp = new Date(message.created_at)
  const fullDateTime = timestamp.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

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
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <h3 className="text-lg font-bold">Message Details</h3>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl font-light leading-none"
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Sender & Room */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Sender
              </label>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {message.isOwn ? 'You' : message.sender}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Room
              </label>
              <RoomBadge room={message.room_id} />
            </div>
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
              Message
            </label>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-900 dark:text-white leading-relaxed break-words">
                {message.content}
              </p>
            </div>
          </div>

          {/* Timestamp */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Sent At
            </label>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{fullDateTime}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200"
          >
            Close
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:shadow-lg transition-all duration-200"
          >
            Copy
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Main Chat History Table Component
export default function ChatHistoryTable({ userId, roomFilter = null }) {
  const [messages, setMessages] = useState([])
  const [filteredMessages, setFilteredMessages] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch messages
  useEffect(() => {
    async function fetchMessages() {
      setIsLoading(true)
      try {
        let query = supabase
          .from('chat_messages')
          .select('*, users:sender_id(id, username)')
          .order('created_at', { ascending: false })
          .limit(200)

        const { data, error } = await query

        if (!error && data) {
          // Enrich with user info and isOwn flag
          const enriched = data.map((msg) => ({
            ...msg,
            sender: msg.users?.username || 'Unknown',
            isOwn: msg.sender_id === userId,
          }))
          setMessages(enriched)
        }
      } catch (err) {
        console.error('Error fetching messages:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) fetchMessages()
  }, [userId])

  // Apply filters
  useEffect(() => {
    let filtered = messages

    if (roomFilter) {
      filtered = filtered.filter((msg) => msg.room_id === roomFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (msg) =>
          msg.content.toLowerCase().includes(query) ||
          msg.sender.toLowerCase().includes(query)
      )
    }

    setFilteredMessages(filtered)
  }, [messages, searchQuery, roomFilter])

  const handleExpand = (message) => {
    setSelectedMessage(message)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageBubbleIcon className="text-indigo-600 dark:text-indigo-400" />
              Chat History
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search messages or senders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
            <MessageBubbleIcon className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-lg font-medium">No messages found</p>
            <p className="text-sm mt-1">
              {searchQuery ? 'Try adjusting your search criteria' : 'Start chatting to see messages here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Message
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Room
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Time
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Action
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {filteredMessages.map((msg, idx) => (
                  <MessageRow
                    key={msg.id}
                    message={msg}
                    index={idx}
                    onExpand={handleExpand}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      <MessageModal
        message={selectedMessage}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
