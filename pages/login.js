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
        
        // Store user info in localStorage for demo purposes
        // In a real app, you'd want to use proper session management
        const normalizedRole = (data.role || '').toLowerCase()
        localStorage.setItem('currentUser', JSON.stringify({
          id: data.id,
          username: data.username,
          role: normalizedRole,
          assigned_machine: data.assigned_machine,
          password_change_required: data.password_change_required || false
        }))

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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>
          🏭 Korv Factory Login
        </h1>
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Username:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              placeholder="Enter your username"
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              PIN:
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              placeholder="Enter your PIN"
            />
          </div>
          
          {error && (
            <div style={{
              color: 'red',
              backgroundColor: '#ffebee',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
              border: '1px solid #ffcdd2'
            }}>
              {error}
            </div>
          )}
          
          {success && (
            <div style={{
              color: 'green',
              backgroundColor: '#e8f5e8',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
              border: '1px solid #c8e6c9'
            }}>
              {success}
            </div>
          )}

          {connectionTest && (
            <div style={{
              color: connectionTest.includes('✅') ? 'green' : 'red',
              backgroundColor: connectionTest.includes('✅') ? '#e8f5e8' : '#ffebee',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
              border: connectionTest.includes('✅') ? '1px solid #c8e6c9' : '1px solid #ffcdd2',
              fontSize: '0.9rem'
            }}>
              <strong>Connection Test:</strong> {connectionTest}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            onClick={testSupabaseConnection}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            🔄 Test Connection
          </button>
        </div>
        
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Demo Credentials:</h4>
          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>• <strong>Anushwa</strong> (admin) - PIN: 000000</p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>• <strong>Dhanashree</strong> (manager) - PIN: 000000</p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>• <strong>Anil</strong> (operator) - PIN: 000000</p>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <a href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}