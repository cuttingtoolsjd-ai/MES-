// ForcePasswordChangeModal.js
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ForcePasswordChangeModal({ user, onPasswordChanged }) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!newPin || !confirmPin) {
      setError('Both fields are required');
      setLoading(false);
      return;
    }

    if (newPin.length < 6) {
      setError('PIN must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match');
      setLoading(false);
      return;
    }

    if (newPin === '000000') {
      setError('Please choose a different PIN than the default');
      setLoading(false);
      return;
    }

    try {
      // Update user's PIN and clear the password_change_required flag
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          pin: newPin, 
          password_change_required: false,
          updated_at: new Date().toISOString() 
        })
        .eq('username', user.username);

      if (updateError) {
        setError('Error updating PIN: ' + updateError.message);
        setLoading(false);
        return;
      }

      // Update localStorage to reflect the change
      const updatedUser = { ...user, password_change_required: false };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      // Notify parent component
      onPasswordChanged();
    } catch (err) {
      setError('Unexpected error: ' + err.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
            <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Change Your PIN</h2>
          <p className="text-gray-600 text-sm">
            You're using the default PIN (000000). For security reasons, please create a new PIN before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New PIN (minimum 6 characters)
            </label>
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new PIN"
              required
              minLength={6}
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New PIN
            </label>
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Re-enter new PIN"
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
          >
            {loading ? 'Updating PIN...' : 'Set New PIN'}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            You can change your PIN later from the Settings page
          </p>
        </form>
      </div>
    </div>
  );
}
