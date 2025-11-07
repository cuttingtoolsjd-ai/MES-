import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import EmployeeTable from '../EmployeeTable'

export default function EmployeeForm({ onUserCreated }) {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userMessage, setUserMessage] = useState('')
  const [userForm, setUserForm] = useState({ 
    username: '', 
    role: 'operator', 
    assigned_machine: '' 
  })
  const [userSubmitting, setUserSubmitting] = useState(false)

  // Fetch users on mount
  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, assigned_machine, active, created_at, updated_at, korv')
        .order('created_at', { ascending: false })
      if (error) {
        setUserMessage('Error fetching users: ' + error.message)
      } else {
        setUsers(data || [])
      }
    } catch (err) {
      setUserMessage('Unexpected error: ' + err.message)
    } finally {
      setLoadingUsers(false)
    }
  }

  async function handleAddUser(e) {
    e.preventDefault()
    if (!userForm.username.trim()) {
      setUserMessage('Username is required')
      return
    }
    setUserSubmitting(true)
    setUserMessage('')
    try {
      const { error } = await supabase
        .from('users')
        .insert([{
          username: userForm.username.trim(),
          role: userForm.role,
          assigned_machine: userForm.assigned_machine.trim() || null,
          pin: '000000',
          active: true,
          password_change_required: true
        }])
      if (error) {
        setUserMessage('Error creating user: ' + error.message)
      } else {
        setUserMessage('✅ Employee added successfully!')
        setUserForm({ username: '', role: 'operator', assigned_machine: '' })
        fetchUsers()
        if (onUserCreated) onUserCreated()
        setTimeout(() => setUserMessage(''), 3000)
      }
    } catch (err) {
      setUserMessage('Unexpected error: ' + err.message)
    } finally {
      setUserSubmitting(false)
    }
  }

  async function handleDeactivateUser(userId) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ active: false })
        .eq('id', userId)
      if (error) {
        setUserMessage('Error deactivating user: ' + error.message)
      } else {
        fetchUsers()
      }
    } catch (err) {
      setUserMessage('Unexpected error: ' + err.message)
    }
  }

  async function handleReactivateUser(userId) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ active: true })
        .eq('id', userId)
      if (error) {
        setUserMessage('Error reactivating user: ' + error.message)
      } else {
        fetchUsers()
      }
    } catch (err) {
      setUserMessage('Unexpected error: ' + err.message)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Add Employee Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Employee</h2>
        {userMessage && (
          <div className={`mb-4 p-4 rounded-md ${
            userMessage.includes('✅') || userMessage.includes('successfully')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {userMessage}
          </div>
        )}
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              id="username"
              value={userForm.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              id="role"
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="operator">Operator</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label htmlFor="assigned_machine" className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Machine (Optional)
            </label>
            <input
              type="text"
              id="assigned_machine"
              value={userForm.assigned_machine}
              onChange={(e) => setUserForm({ ...userForm, assigned_machine: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., CNC-001, Lathe-003"
            />
          </div>
          <button
            type="submit"
            disabled={userSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {userSubmitting ? 'Adding Employee...' : 'Add Employee'}
          </button>
        </form>
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> New employees will have a default PIN of{' '}
            <code className="bg-gray-200 px-1 rounded">000000</code>
          </p>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">All Employees</h2>
        {loadingUsers ? (
          <div className="text-center py-4">Loading employees...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No employees found</div>
        ) : (
          <EmployeeTable 
            users={users} 
            onDeactivate={handleDeactivateUser} 
            onReactivate={handleReactivateUser} 
          />
        )}
        <div className="mt-4 text-center">
          <button
            onClick={fetchUsers}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            🔄 Refresh List
          </button>
        </div>
      </div>
    </div>
  )
}
