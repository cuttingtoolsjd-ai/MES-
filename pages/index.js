import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        setError(error.message)
      } else {
        setUsers(data || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>🏭 Korv Factory App</h1>
      <p>Welcome to the Korv Factory management system with Supabase integration.</p>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>👥 Users</h2>
        
        {loading && <p>Loading users...</p>}
        
        {error && (
          <div style={{ color: 'red', padding: '1rem', border: '1px solid red', borderRadius: '4px' }}>
            <strong>Error:</strong> {error}
            <br />
            <small>Make sure you have created the users table in Supabase using the SQL migration.</small>
          </div>
        )}
        
        {!loading && !error && users.length === 0 && (
          <p>No users found. Run the setup script to insert initial users.</p>
        )}
        
        {users.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>Username</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>Role</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>Assigned Machine</th>
                  <th style={{ padding: '0.5rem', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{user.username}</td>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                      <span style={{ 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem',
                        backgroundColor: user.role === 'admin' ? '#e3f2fd' : user.role === 'manager' ? '#f3e5f5' : '#e8f5e8',
                        color: user.role === 'admin' ? '#1976d2' : user.role === 'manager' ? '#7b1fa2' : '#388e3c'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{user.assigned_machine || 'None'}</td>
                    <td style={{ padding: '0.5rem', border: '1px solid #ddd' }}>
                      <span style={{ 
                        color: user.active ? 'green' : 'red',
                        fontWeight: 'bold'
                      }}>
                        {user.active ? '✓ Active' : '✗ Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div style={{ marginTop: '2rem' }}>
          <button 
            onClick={fetchUsers}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Users
          </button>
        </div>
      </div>
      
      <div style={{ marginTop: '3rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <h3>🚀 Next Steps</h3>
        <ul>
          <li>Create the users table in Supabase using the SQL migration</li>
          <li>Run <code>npm run insert-users</code> to add initial users</li>
          <li>Visit <a href="/login" style={{ color: '#0070f3' }}>/login</a> to test authentication</li>
          <li>Check the console for any connection issues</li>
        </ul>
      </div>
    </div>
  )
}