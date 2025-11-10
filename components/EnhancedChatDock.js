import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Enhanced chat dock with DMs, teams, and global chat
export default function EnhancedChatDock({ user, customerContextId }) {
  const [open, setOpen] = useState(false)
  const [room, setRoom] = useState('global')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [showNewDM, setShowNewDM] = useState(false)
  const [showNewTeam, setShowNewTeam] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const pollRef = useRef(null)

  // Fetch all users for DM selection
  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase.from('users').select('id, username').eq('active', true)
      setUsers((data || []).filter(u => u.id !== user.id))
    }
    fetchUsers()
  }, [user.id])

  // Parse teams from localStorage (simple implementation; extend with DB table later)
  useEffect(() => {
    const stored = localStorage.getItem('chat_teams')
    if (stored) setTeams(JSON.parse(stored))
  }, [])

  useEffect(() => {
    if (customerContextId) setRoom(`customer:${customerContextId}`)
  }, [customerContextId])

  async function fetchMessages() {
    if (!room) return
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, users:sender_id(id, username)')
      .eq('room_id', room)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error) setMessages((data || []).slice().reverse())
  }

  useEffect(() => {
    fetchMessages()
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(fetchMessages, 3000)
    return () => pollRef.current && clearInterval(pollRef.current)
  }, [room])

  async function sendMessage(e) {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    const newMsg = { room_id: room, sender_id: user.id, content: input.trim() }
    setMessages(m => [...m, { ...newMsg, id: 'opt-' + Date.now(), created_at: new Date().toISOString(), users: { username: user.username } }])
    setInput('')
    const { error } = await supabase.from('chat_messages').insert([newMsg])
    if (error) {
      setMessages(m => m.filter(msg => !msg.id.startsWith('opt-')))
      alert('Failed to send: ' + error.message)
    } else fetchMessages()
    setLoading(false)
  }

  function startDM(targetUserId, targetUsername) {
    const dmRoom = [user.id, targetUserId].sort().join(':')
    setRoom(`dm:${dmRoom}`)
    setShowNewDM(false)
    fetchMessages()
  }

  function createTeam() {
    if (!teamName.trim() || selectedUsers.length === 0) return
    const teamId = 'team:' + Date.now()
    const newTeam = { id: teamId, name: teamName, members: [user.id, ...selectedUsers] }
    const updated = [...teams, newTeam]
    setTeams(updated)
    localStorage.setItem('chat_teams', JSON.stringify(updated))
    setRoom(teamId)
    setTeamName('')
    setSelectedUsers([])
    setShowNewTeam(false)
  }

  const roomLabel = room.startsWith('dm:') ? '💬 Direct Message' : room.startsWith('team:') ? '👥 Team' : room.startsWith('customer:') ? `📦 ${room}` : '🌍 Global'

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-3 rounded-full shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold hover:shadow-xl hover:scale-110 transition-all"
        >
          💬 Chat
        </button>
      )}
      {open && (
        <div className="w-80 sm:w-96 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl ring-1 ring-white/20 flex flex-col overflow-hidden border border-purple-500/30">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
            <span className="font-bold">{roomLabel}</span>
            <button onClick={() => setOpen(false)} className="text-lg hover:bg-white/20 px-2 py-1 rounded">×</button>
          </div>

          {/* Room Selector */}
          <div className="px-3 py-2 bg-slate-800/50 border-b border-white/10 max-h-32 overflow-y-auto space-y-1">
            <button onClick={() => setRoom('global')} className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition ${room === 'global' ? 'bg-indigo-600 text-white' : 'text-white/70 hover:bg-white/10'}`}>🌍 Global</button>
            {customerContextId && (
              <button onClick={() => setRoom(`customer:${customerContextId}`)} className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition ${room === `customer:${customerContextId}` ? 'bg-indigo-600 text-white' : 'text-white/70 hover:bg-white/10'}`}>📦 This Customer</button>
            )}
            <div className="text-xs font-bold text-white/60 mt-2 px-2">Direct Messages</div>
            {users.slice(0, 3).map(u => (
              <button key={u.id} onClick={() => startDM(u.id, u.username)} className="w-full text-left px-2 py-1 rounded text-xs text-white/70 hover:bg-white/10 transition">💬 {u.username}</button>
            ))}
            <button onClick={() => setShowNewDM(!showNewDM)} className="w-full text-left px-2 py-1 rounded text-xs text-indigo-400 hover:bg-white/10">+ More DMs</button>
            <div className="text-xs font-bold text-white/60 mt-2 px-2">Teams</div>
            {teams.map(t => (
              <button key={t.id} onClick={() => setRoom(t.id)} className={`w-full text-left px-2 py-1 rounded text-xs font-medium transition ${room === t.id ? 'bg-indigo-600 text-white' : 'text-white/70 hover:bg-white/10'}`}>👥 {t.name}</button>
            ))}
            <button onClick={() => setShowNewTeam(!showNewTeam)} className="w-full text-left px-2 py-1 rounded text-xs text-indigo-400 hover:bg-white/10">+ Create Team</button>
          </div>

          {/* DM Selection */}
          {showNewDM && (
            <div className="px-3 py-2 bg-slate-800/50 border-b border-white/10 space-y-1 max-h-40 overflow-y-auto">
              {users.map(u => (
                <button key={u.id} onClick={() => startDM(u.id, u.username)} className="w-full text-left px-2 py-1 rounded text-xs text-white/70 hover:bg-indigo-600/50 transition">{u.username}</button>
              ))}
            </div>
          )}

          {/* Team Creation */}
          {showNewTeam && (
            <div className="px-3 py-2 bg-slate-800/50 border-b border-white/10 space-y-2">
              <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team name..." className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-xs text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <div className="max-h-20 overflow-y-auto space-y-1">
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-2 text-xs text-white/70 cursor-pointer hover:bg-white/5 px-1 py-0.5 rounded">
                    <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={e => e.target.checked ? setSelectedUsers([...selectedUsers, u.id]) : setSelectedUsers(selectedUsers.filter(id => id !== u.id))} className="w-3 h-3" />
                    {u.username}
                  </label>
                ))}
              </div>
              <button onClick={createTeam} disabled={!teamName.trim() || selectedUsers.length === 0} className="w-full px-2 py-1 bg-indigo-600 disabled:bg-indigo-600/50 text-white text-xs rounded font-medium">Create</button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 text-xs max-h-60">
            {messages.length === 0 && <div className="text-white/50 text-center py-4">No messages yet</div>}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-3 py-1.5 rounded-lg max-w-xs ${m.sender_id === user.id ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/90'}`}>
                  {m.sender_id !== user.id && <div className="text-xs font-bold text-indigo-300">{m.users?.username || 'Unknown'}</div>}
                  <div>{m.content}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <form onSubmit={sendMessage} className="border-t border-white/10 p-2 flex gap-2 bg-slate-900">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type message..."
              className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1.5 text-xs text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button disabled={loading} className="px-3 py-1.5 bg-indigo-600 disabled:bg-indigo-600/50 text-white text-xs rounded font-medium">Send</button>
          </form>
        </div>
      )}
    </div>
  )
}
