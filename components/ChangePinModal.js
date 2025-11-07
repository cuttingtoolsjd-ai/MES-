import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ChangePinModal({ user, onClose, onSuccess }) {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleChangePin(e) {
    e.preventDefault()
    setError('')

    // Validation
    if (!currentPin || !newPin || !confirmPin) {
      setError('All fields are required')
      return
    }

    if (newPin.length !== 6) {
      setError('New PIN must be exactly 6 digits')
      return
    }

    if (!/^\d{6}$/.test(newPin)) {
      setError('PIN must contain only numbers')
      return
    }

    if (newPin !== confirmPin) {
      setError('New PIN and confirmation do not match')
      return
    }

    if (currentPin === newPin) {
      setError('New PIN must be different from current PIN')
      return
    }

    setLoading(true)

    try {
      // Verify current PIN
      const { data: userData, error: verifyError } = await supabase
        .from('users')
        .select('pin')
        .eq('id', user.id)
        .single()

      if (verifyError) {
        setError('Error verifying current PIN')
        setLoading(false)
        return
      }

      if (userData.pin !== currentPin) {
        setError('Current PIN is incorrect')
        setLoading(false)
        return
      }

      // Update PIN
      const { error: updateError } = await supabase
        .from('users')
        .update({ pin: newPin })
        .eq('id', user.id)

      if (updateError) {
        setError('Error updating PIN: ' + updateError.message)
        setLoading(false)
        return
      }

      // Success
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      setError('Unexpected error: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Change PIN</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleChangePin} className="space-y-3 sm:space-y-4">
          {error && (
            <div className="alert alert-error text-xs sm:text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="currentPin" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Current PIN
            </label>
            <input
              type="password"
              id="currentPin"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              maxLength={6}
              className="input-field text-sm sm:text-base"
              placeholder="Enter current 6-digit PIN"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label htmlFor="newPin" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              New PIN
            </label>
            <input
              type="password"
              id="newPin"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              maxLength={6}
              className="input-field text-sm sm:text-base"
              placeholder="Enter new 6-digit PIN"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPin" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Confirm New PIN
            </label>
            <input
              type="password"
              id="confirmPin"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              maxLength={6}
              className="input-field text-sm sm:text-base"
              placeholder="Re-enter new PIN"
              autoComplete="off"
              required
            />
          </div>

          <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 text-sm sm:text-base"
            >
              {loading ? 'Updating...' : 'Change PIN'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 text-sm sm:text-base"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-xs text-blue-700">
            <strong>Note:</strong> Your PIN must be exactly 6 digits and contain only numbers.
          </p>
        </div>
      </div>
    </div>
  )
}
