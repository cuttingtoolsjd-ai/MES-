import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Lightweight chat dock (global + customer:<id>) using polling; upgrade to WebSocket later.
export default function ChatDock({ user, customerContextId }) {
  const [open, setOpen] = useState(false)
  const [room, setRoom] = useState('global')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    if (customerContextId) setRoom(`customer:${customerContextId}`)
  }, [customerContextId])

  async function fetchMessages() {
    if (!room) return
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', room)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error) setMessages((data || []).slice().reverse())
  }

  useEffect(() => {
    fetchMessages()
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(fetchMessages, 5000)
    return () => pollRef.current && clearInterval(pollRef.current)
  }, [room])

  async function sendMessage(e) {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    const newMsg = { room_id: room, sender_id: user.id, content: input.trim() }
    // Optimistic append
    setMessages(m => [...m, { ...newMsg, id: 'optimistic-' + Date.now(), created_at: new Date().toISOString() }])
    setInput('')
    const { error } = await supabase.from('chat_messages').insert([newMsg])
    if (error) {
      // rollback optimistic append (simple)
      setMessages(m => m.filter(msg => !msg.id.startsWith('optimistic-')))
      alert('Failed to send message: ' + error.message)
    } else fetchMessages()
    setLoading(false)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-full shadow bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500"
        >Chat</button>
      )}
      {open && (
        <div className="w-72 sm:w-80 bg-white rounded-xl shadow-lg ring-1 ring-black/10 flex flex-col overflow-hidden">
          <div className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
            <span className="text-sm font-semibold">Chat ({room})</span>
            <div className="flex items-center gap-2">
              <select
                value={room}
                onChange={e => setRoom(e.target.value)}
                className="text-xs bg-white/20 rounded px-1 py-0.5 focus:outline-none"
              >
                <option value="global">global</option>
                {customerContextId && <option value={`customer:${customerContextId}`}>customer:{customerContextId}</option>}
              </select>
              <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 rounded bg-white/20 hover:bg-white/30">×</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-xs">
            {messages.length === 0 && <div className="text-gray-500">No messages</div>}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}> 
                <div className={`px-2 py-1 rounded-lg max-w-[80%] ${m.sender_id === user.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{m.content}</div>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="border-t border-gray-200 p-2 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type message..."
              className="flex-1 bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button disabled={loading} className="px-3 py-1 bg-indigo-600 disabled:bg-indigo-400 text-white text-xs rounded">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
