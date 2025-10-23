// ConsumableUsageForm.js
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import TypedItemCodeInput from './TypedItemCodeInput';

const USAGE_TYPES = [
  { value: 'USED', label: 'Used' },
  { value: 'CHANGED', label: 'Changed' },
  { value: 'MAINTENANCE', label: 'Maintenance' }
];

export default function ConsumableUsageForm({ user }) {
  const [form, setForm] = useState({ item_code: '', machine: '', usage_type: 'USED', quantity: 1, note: '', used_on: '' });
  const [itemId, setItemId] = useState(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleItemCodeResolved(item) {
    if (item) {
      setItemId(item.id);
      setForm(f => ({ ...f, item_code: item.item_code, machine: item.machine || '' }));
    } else {
      setItemId(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!itemId) {
      setToast('❌ Please enter a valid item code');
      return;
    }
    setLoading(true);
    setToast('');
    const { error } = await supabase.from('consumable_usage_logs').insert({
      item_id: itemId,
      machine: form.machine,
      operator: user?.username || 'admin',
      usage_type: form.usage_type,
      quantity: form.quantity ? Number(form.quantity) : 1,
      note: form.note,
      used_on: form.used_on || new Date().toISOString().slice(0, 10)
    });
    if (!error) setToast('✅ Usage logged');
    else setToast('❌ ' + error.message);
    setLoading(false);
    setTimeout(() => setToast(''), 2500);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
        <TypedItemCodeInput
          value={form.item_code}
          onChange={v => handleChange('item_code', v)}
          onResolved={handleItemCodeResolved}
          groupCode="CONS"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
        <input type="text" value={form.machine} onChange={e => handleChange('machine', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Usage Type</label>
        <select value={form.usage_type} onChange={e => handleChange('usage_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
          {USAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
        <input type="number" min={1} value={form.quantity} onChange={e => handleChange('quantity', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
        <input type="text" value={form.note} onChange={e => handleChange('note', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Used On</label>
        <input type="date" value={form.used_on} onChange={e => handleChange('used_on', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
      </div>
      <div className="md:col-span-2 flex gap-2 mt-2">
        <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium">
          {loading ? 'Logging...' : 'Log Usage'}
        </button>
      </div>
      {toast && <div className="md:col-span-2 mt-2 text-center text-sm font-medium">{toast}</div>}
    </form>
  );
}
