import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function UserTable({ showActions = false, currentUser = null }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('username')

      if (error) {
        setError(error.message)
      } else {
        setUsers(data || [])
        setError('')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleUserStatus(userId, currentStatus) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        alert('Error updating user status: ' + error.message)
      } else {
        fetchUsers() // Refresh the list
      }
    } catch (err) {
      alert('Unexpected error: ' + err.message)
    }
  }

  if (loading) return <div>Loading users...</div>

  if (error) {
    return (
      <div className="error">
        <strong>Error:</strong> {error}
      </div>
    )
  }

  if (users.length === 0) {
    return <div>No users found. Run the setup script to insert initial users.</div>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Assigned Machine</th>
            <th>Status</th>
            <th>Last Updated</th>
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} style={{
              backgroundColor: currentUser && user.id === currentUser.id ? '#fff3cd' : 'transparent'
            }}>
              <td>
                {user.username}
                {currentUser && user.id === currentUser.id && (
                  <span style={{ color: '#856404', marginLeft: '0.5rem' }}>(You)</span>
                )}
              </td>
              <td>
                <span className={`badge badge-${user.role}`}>
                  {user.role}
                </span>
              </td>
              <td>
                {user.assigned_machine || (
                  <span style={{ color: '#666', fontStyle: 'italic' }}>None</span>
                )}
              </td>
              <td>
                <span className={user.active ? 'status-active' : 'status-inactive'}>
                  {user.active ? '✓ Active' : '✗ Inactive'}
                </span>
              </td>
              <td style={{ fontSize: '0.9rem', color: '#666' }}>
                {user.updated_at ? new Date(user.updated_at).toLocaleString() : 'N/A'}
              </td>
              {showActions && (
                <td>
                  <button
                    onClick={() => toggleUserStatus(user.id, user.active)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.8rem',
                      backgroundColor: user.active ? '#dc3545' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {user.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <button 
        onClick={fetchUsers}
        className="button"
        style={{ marginTop: '1rem' }}
      >
        Refresh Users
      </button>
    </div>
  )
}