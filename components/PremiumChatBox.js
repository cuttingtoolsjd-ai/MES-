import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'

// Icons (using simple inline SVG or text icons)
const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const MinimizeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
)

const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
)

// Floating Chat Button
export function ChatButton({ onClick, isDark = false }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`rounded-full p-4 shadow-xl transition-all duration-300 ${
        isDark
          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:shadow-2xl'
          : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:shadow-2xl'
      } text-white font-semibold flex items-center justify-center gap-2`}
    >
      <span>💬</span>
      <span className="hidden sm:inline">Chat</span>
    </motion.button>
  )
}

// Message Bubble Component
function MessageBubble({ message, isOwn, senderUsername }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2 mb-3`}
    >
      <div
        className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-xs sm:max-w-sm`}
      >
        {!isOwn && (
          <span className="text-xs font-semibold text-slate-400 mb-1 px-1">
            {senderUsername}
          </span>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-200 ${
            isOwn
              ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-none'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none'
          }`}
        >
          <p className="text-sm leading-relaxed break-words">{message.content}</p>
        </div>
        <span
          className={`text-xs mt-1.5 ${
            isOwn
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </motion.div>
  )
}

// Room Selector Tab
function RoomTab({ label, icon, active, onClick }) {
  return (
    <motion.button
      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 mb-1 ${
        active
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
          : 'text-slate-400 hover:text-slate-300'
      }`}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </motion.button>
  )
}

// Main Premium Chat Box
export default function PremiumChatBox({ user, customerContextId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeRoom, setActiveRoom] = useState('global')
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [showDMMenu, setShowDMMenu] = useState(false)
  const [showTeamMenu, setShowTeamMenu] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const messagesEndRef = useRef(null)
  const pollRef = useRef(null)

  // Fetch all active users
  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase
        .from('users')
        .select('id, username')
        .eq('active', true)
      setAllUsers((data || []).filter((u) => u.id !== user?.id))
    }
    if (user) fetchUsers()
  }, [user?.id])

  // Load teams from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('chat_teams')
    if (stored) setTeams(JSON.parse(stored))
  }, [])

  // Set customer context if provided
  useEffect(() => {
    if (customerContextId) setActiveRoom(`customer:${customerContextId}`)
  }, [customerContextId])

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch messages
  async function fetchMessages() {
    if (!activeRoom) return
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, users:sender_id(id, username)')
        .eq('room_id', activeRoom)
        .order('created_at', { ascending: true })
        .limit(100)
      if (!error && data) setMessages(data)
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }

  // Set up polling
  useEffect(() => {
    fetchMessages()
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(fetchMessages, 3000)
    return () => pollRef.current && clearInterval(pollRef.current)
  }, [activeRoom])

  // Send message
  async function handleSendMessage(e) {
    e.preventDefault()
    if (!inputValue.trim() || !user) return

    setIsLoading(true)

    // Optimistic update
    const optimisticMsg = {
      id: `opt-${Date.now()}`,
      room_id: activeRoom,
      sender_id: user.id,
      content: inputValue.trim(),
      created_at: new Date().toISOString(),
      users: { username: user.username },
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setInputValue('')

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([
          {
            room_id: activeRoom,
            sender_id: user.id,
            content: inputValue.trim(),
          },
        ])

      if (error) {
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== optimisticMsg.id)
        )
        console.error('Send error:', error.message)
      } else {
        fetchMessages()
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMsg.id))
    }

    setIsLoading(false)
  }

  // Start DM with user
  function startDM(targetId, targetUsername) {
    const dmRoom = [user.id, targetId].sort().join(':')
    setActiveRoom(`dm:${dmRoom}`)
    setShowDMMenu(false)
  }

  // Create team
  function handleCreateTeam() {
    if (!teamName.trim() || selectedUsers.length === 0) return
    const teamId = `team:${Date.now()}`
    const newTeam = {
      id: teamId,
      name: teamName,
      members: [user.id, ...selectedUsers],
    }
    const updated = [...teams, newTeam]
    setTeams(updated)
    localStorage.setItem('chat_teams', JSON.stringify(updated))
    setActiveRoom(teamId)
    setTeamName('')
    setSelectedUsers([])
    setShowTeamMenu(false)
  }

  // Get room display label
  const getRoomLabel = () => {
    if (activeRoom === 'global') return '🌍 Global'
    if (activeRoom.startsWith('customer:')) return '📦 Customer'
    if (activeRoom.startsWith('dm:')) return '💬 Direct Message'
    if (activeRoom.startsWith('team:')) {
      const team = teams.find((t) => t.id === activeRoom)
      return team ? `👥 ${team.name}` : '👥 Team'
    }
    return activeRoom
  }

  if (!user) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 font-inter">
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <ChatButton onClick={() => setIsOpen(true)} isDark />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-0 right-0 w-96 h-[560px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <h2 className="text-lg font-bold tracking-tight">{getRoomLabel()}</h2>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMinimized(true)}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  title="Minimize"
                >
                  <MinimizeIcon />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                  title="Close"
                >
                  <CloseIcon />
                </motion.button>
              </div>
            </div>

            {/* Room Selector / Sidebar */}
            <div className="w-full h-24 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 overflow-y-auto">
              <RoomTab
                label="Global"
                icon="🌍"
                active={activeRoom === 'global'}
                onClick={() => setActiveRoom('global')}
              />
              {customerContextId && (
                <RoomTab
                  label="Customer"
                  icon="📦"
                  active={activeRoom === `customer:${customerContextId}`}
                  onClick={() => setActiveRoom(`customer:${customerContextId}`)}
                />
              )}

              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3 mb-2 px-1 uppercase tracking-wider">
                Direct Messages
              </div>

              {allUsers.slice(0, 2).map((u) => (
                <RoomTab
                  key={u.id}
                  label={u.username}
                  icon="💬"
                  active={activeRoom === `dm:${[user.id, u.id].sort().join(':')}`}
                  onClick={() => startDM(u.id, u.username)}
                />
              ))}

              {allUsers.length > 2 && (
                <motion.button
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                  onClick={() => setShowDMMenu(!showDMMenu)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-indigo-600 dark:text-indigo-400 font-medium transition-colors duration-200 mb-1 flex items-center gap-2"
                >
                  <PlusIcon /> More DMs
                </motion.button>
              )}

              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3 mb-2 px-1 uppercase tracking-wider">
                Teams
              </div>

              {teams.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 px-1 py-2">
                  No teams yet
                </p>
              )}

              {teams.map((t) => (
                <RoomTab
                  key={t.id}
                  label={t.name}
                  icon="👥"
                  active={activeRoom === t.id}
                  onClick={() => setActiveRoom(t.id)}
                />
              ))}

              <motion.button
                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                onClick={() => setShowTeamMenu(!showTeamMenu)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-indigo-600 dark:text-indigo-400 font-medium transition-colors duration-200 mt-1 flex items-center gap-2"
              >
                <PlusIcon /> New Team
              </motion.button>
            </div>

            {/* DM Menu */}
            <AnimatePresence>
              {showDMMenu && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 max-h-40 overflow-y-auto"
                >
                  {allUsers.map((u) => (
                    <motion.button
                      key={u.id}
                      whileHover={{ x: 4 }}
                      onClick={() => startDM(u.id, u.username)}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mb-1"
                    >
                      {u.username}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Team Creation Menu */}
            <AnimatePresence>
              {showTeamMenu && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 space-y-2"
                >
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Team name..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />

                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {allUsers.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={(e) =>
                            e.target.checked
                              ? setSelectedUsers([...selectedUsers, u.id])
                              : setSelectedUsers(
                                  selectedUsers.filter((id) => id !== u.id)
                                )
                          }
                          className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {u.username}
                        </span>
                      </label>
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateTeam}
                    disabled={!teamName.trim() || selectedUsers.length === 0}
                    className="w-full px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Create Team
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-white dark:bg-slate-900">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-center">
                  <div>
                    <p className="text-lg font-semibold mb-1">No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === user.id}
                  senderUsername={msg.users?.username || 'Unknown'}
                />
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-white dark:bg-slate-900">
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 text-sm transition-all duration-200"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="p-2.5 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  title="Send message"
                >
                  <SendIcon />
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}

        {isOpen && isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-0 right-0 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {getRoomLabel()}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMinimized(false)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MenuIcon />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
