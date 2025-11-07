import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [connectionTest, setConnectionTest] = useState('')
  const router = useRouter()

  // Test Supabase connection on component mount
  useEffect(() => {
    testSupabaseConnection()
  }, [])

  async function testSupabaseConnection() {
    try {
      console.log('🔄 Testing Supabase connection...')
      const { data, error } = await supabase.from('users').select('*')
      
      if (error) {
        console.error('❌ Supabase connection error:', error)
        setConnectionTest(`❌ Connection Error: ${error.message}`)
      } else {
        console.log('✅ Supabase connection successful!')
        console.log('📊 Users data:', data)
        setConnectionTest(`✅ Connected! Found ${data ? data.length : 0} users`)
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err)
      setConnectionTest(`❌ Unexpected Error: ${err.message}`)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Authenticate user with username and PIN
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('pin', pin)
        .eq('active', true)
        .single()

      if (error) {
        setError('Invalid credentials or user not found')
      } else {
        setSuccess(`Welcome ${data.username}! Role: ${data.role}`)
        
        // Record login timestamp in database
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.id)
        
        // Store user info in both localStorage and sessionStorage for persistence
        // This ensures the session survives browser refreshes
        const normalizedRole = (data.role || '').toLowerCase()
        const userPayload = {
          id: data.id,
          username: data.username,
          role: normalizedRole,
          assigned_machine: data.assigned_machine,
          password_change_required: data.password_change_required || false
        }
        
        localStorage.setItem('currentUser', JSON.stringify(userPayload))
        sessionStorage.setItem('currentUser', JSON.stringify(userPayload))
        sessionStorage.setItem('authTimestamp', new Date().toISOString())

        // Redirect to role-specific dashboard after successful login
        setTimeout(() => {
          router.push(`/dashboard/${normalizedRole}`)
        }, 1500)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 lg:px-8 py-6" style={{
      background: 'linear-gradient(135deg, #fdf9f9ff 0%, #b57878ff 100%)'
    }}>
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="JD Cutting Tools" 
              className="h-16 w-16 sm:h-20 sm:w-20 object-contain"
            />
          </div>

          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
            Login
          </h2>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter username"
                style={{
                  background: 'white',
                  color: '#333'
                }}
              />
            </div>
            
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter password"
                style={{
                  background: 'white',
                  color: '#333'
                }}
              />
            </div>
          
          {error && (
            <div className="text-red-600 text-xs sm:text-sm text-center">
              {error}
            </div>
          )}
          
          {success && (
            <div className="text-green-600 text-xs sm:text-sm text-center">
              {success}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-9 rounded-xl font-semibold text-lg sm:text-xl shadow-md transition-all duration-300 hover:shadow-lg active:scale-[.98] disabled:opacity-70"
            style={{
              background: loading ? '#a37978ff' : '#fc2525ff',
              color: 'white'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.background = '#f21e1ebd')}
            onMouseLeave={(e) => !loading && (e.target.style.background = '#f61a0bff')}
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
    </div>
  )
}