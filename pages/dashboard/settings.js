import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { listMachinesSettings, upsertMachineSettings, moveAssignments, listAssignmentsForMachine } from '../../lib/machines'

const MACHINE_IDS = ['CNC1','CNC2','CNC3','CNC4','CNC5','CNC7','CYLN1','CYLN2','CPX','TOPWORK','T&C1','T&C2','OPG1','SPIRONI','ZOLLER','COATING','EDM']

export default function SettingsPage() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [reassignFrom, setReassignFrom] = useState('')
  const [reassignTo, setReassignTo] = useState('')
  const [previewAssignments, setPreviewAssignments] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [passwordForm, setPasswordForm] = useState({ currentPin: '', newPin: '', confirmPin: '' })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    // Get current user from localStorage
    const userStr = localStorage.getItem('currentUser')
    if (userStr) {
      setCurrentUser(JSON.parse(userStr))
    }

    async function load() {
      setLoading(true)
      const { data } = await listMachinesSettings(MACHINE_IDS)
      const map = {}
      data.forEach(r => { map[r.machine_id] = r })
      setSettings(map)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(machine_id, updates) {
    const base = settings[machine_id] || { machine_id, max_korv: 100, maintenance: false }
    const payload = { ...base, ...updates }
    const { data, error } = await upsertMachineSettings({ ...payload, updated_by: 'manager' })
    if (!error) {
      setSettings(s => ({ ...s, [machine_id]: data }))
      setToast('✅ Saved ' + machine_id)
      setTimeout(() => setToast(''), 1500)
    } else {
      setToast('❌ ' + error.message)
      setTimeout(() => setToast(''), 2500)
    }
  }

  async function handlePreview(from) {
    const { data } = await listAssignmentsForMachine(from)
    setPreviewAssignments(data || [])
  }

  async function handleReassign() {
    if (!reassignFrom || !reassignTo || reassignFrom === reassignTo) return
    if (!confirm(`Move all active assignments from ${reassignFrom} to ${reassignTo}?`)) return
    const { error } = await moveAssignments({ fromMachine: reassignFrom, toMachine: reassignTo })
    if (error) {
      setToast('❌ ' + error.message)
    } else {
      setToast(`✅ Moved tasks from ${reassignFrom} to ${reassignTo}`)
    }
    setTimeout(() => setToast(''), 2000)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordMessage('')

    // Validate
    if (!passwordForm.currentPin || !passwordForm.newPin || !passwordForm.confirmPin) {
      setPasswordMessage('❌ All fields are required')
      setPasswordLoading(false)
      return
    }

    if (passwordForm.newPin !== passwordForm.confirmPin) {
      setPasswordMessage('❌ New PIN and confirm PIN do not match')
      setPasswordLoading(false)
      return
    }

    if (passwordForm.newPin.length < 6) {
      setPasswordMessage('❌ PIN must be at least 6 characters')
      setPasswordLoading(false)
      return
    }

    try {
      // Verify current PIN
      const { data: userData, error: verifyError } = await supabase
        .from('users')
        .select('id, pin')
        .eq('username', currentUser.username)
        .single()

      if (verifyError || !userData) {
        setPasswordMessage('❌ Error verifying current PIN')
        setPasswordLoading(false)
        return
      }

      if (userData.pin !== passwordForm.currentPin) {
        setPasswordMessage('❌ Current PIN is incorrect')
        setPasswordLoading(false)
        return
      }

      // Update to new PIN
      const { error: updateError } = await supabase
        .from('users')
        .update({ pin: passwordForm.newPin, updated_at: new Date().toISOString() })
        .eq('id', userData.id)

      if (updateError) {
        setPasswordMessage('❌ Error updating PIN: ' + updateError.message)
      } else {
        setPasswordMessage('✅ PIN changed successfully!')
        setPasswordForm({ currentPin: '', newPin: '', confirmPin: '' })
        setTimeout(() => setPasswordMessage(''), 3000)
      }
    } catch (err) {
      setPasswordMessage('❌ Unexpected error: ' + err.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Factory Settings</h1>
      {toast && <div className="mb-3 text-sm font-medium">{toast}</div>}

      {/* Password Change Section */}
      {currentUser && (
        <div className="mb-8 p-6 border rounded-lg bg-white shadow">
          <h2 className="text-xl font-semibold mb-4">Change Your PIN</h2>
          <p className="text-sm text-gray-600 mb-4">Logged in as: <strong>{currentUser.username}</strong></p>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current PIN</label>
              <input 
                type="password" 
                value={passwordForm.currentPin}
                onChange={e => setPasswordForm(prev => ({ ...prev, currentPin: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                disabled={passwordLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New PIN (min 6 characters)</label>
              <input 
                type="password" 
                value={passwordForm.newPin}
                onChange={e => setPasswordForm(prev => ({ ...prev, newPin: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                minLength={6}
                disabled={passwordLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New PIN</label>
              <input 
                type="password" 
                value={passwordForm.confirmPin}
                onChange={e => setPasswordForm(prev => ({ ...prev, confirmPin: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                minLength={6}
                disabled={passwordLoading}
              />
            </div>
            <button 
              type="submit" 
              disabled={passwordLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {passwordLoading ? 'Changing PIN...' : 'Change PIN'}
            </button>
            {passwordMessage && (
              <div className={`p-3 rounded-md text-sm ${passwordMessage.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {passwordMessage}
              </div>
            )}
          </form>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Machine Settings</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MACHINE_IDS.map(id => {
            const s = settings[id] || { machine_id: id, max_korv: 100, maintenance: false }
            return (
              <div key={id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-semibold">{id}</div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!s.maintenance} onChange={e => handleSave(id, { maintenance: e.target.checked })} />
                    <span>Maintenance</span>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600">Max korv per shift</label>
                  <input type="number" min="0" className="border rounded px-2 py-1 w-24" value={s.max_korv}
                    onChange={e => handleSave(id, { max_korv: Math.max(0, Number(e.target.value || 0)) })} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 pt-6 border-t">
        <h2 className="text-xl font-semibold mb-3">Bulk Reassign Tasks</h2>
        <div className="flex items-center gap-2 mb-3">
          <select className="border rounded px-2 py-1" value={reassignFrom} onChange={e => { setReassignFrom(e.target.value); handlePreview(e.target.value) }}>
            <option value="">From machine...</option>
            {MACHINE_IDS.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          <span>→</span>
          <select className="border rounded px-2 py-1" value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
            <option value="">To machine...</option>
            {MACHINE_IDS.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={handleReassign}>Reassign</button>
        </div>
        {previewAssignments.length > 0 && (
          <div className="border rounded p-3 bg-gray-50">
            <div className="text-sm font-medium mb-2">Assignments on {reassignFrom}</div>
            <ul className="text-sm space-y-1">
              {previewAssignments.map(a => (
                <li key={a.id} className="flex justify-between border-b border-gray-200 py-1">
                  <span>WO: {a.workorder_no || a.work_order_id} • {a.assigned_korv} • {(JSON.parse(a.notes||'{}').dept||'').toUpperCase()}</span>
                  <span className="text-gray-500">{(JSON.parse(a.notes||'{}').day||'-')} / {(JSON.parse(a.notes||'{}').shift||'-')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
