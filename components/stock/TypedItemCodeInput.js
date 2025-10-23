// TypedItemCodeInput.js
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function TypedItemCodeInput({ value, onChange, onResolved, groupCode, disabled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleBlurOrEnter(e) {
    if (!value) return;
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .eq('item_code', value)
      .maybeSingle();
    setLoading(false);
    if (error) setError(error.message);
    if (data) {
      onResolved(data);
    } else {
      onResolved(null);
    }
  }

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={handleBlurOrEnter}
        onKeyDown={e => e.key === 'Enter' && handleBlurOrEnter(e)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        placeholder="Enter or scan item code"
        disabled={disabled}
      />
      {loading && <div className="text-xs text-gray-500 mt-1">Looking up...</div>}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}
