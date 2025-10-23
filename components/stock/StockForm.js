// StockForm.js
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import TypedItemCodeInput from './TypedItemCodeInput';

const GROUP_FIELDS = {
  FG_RG: [
    'item_name', 'item_code', 'unit', 'quantity', 'location', 'unit_cost', 'notes'
  ],
  RAW: [
    'item_name', 'item_code', 'unit', 'quantity', 'min_required', 'unit_cost', 'location', 'notes'
  ],
  CONS: [
    'item_name', 'item_code', 'machine', 'unit', 'quantity', 'min_required', 'unit_cost', 'location', 'notes'
  ]
};

const FIELD_LABELS = {
  item_name: 'Item Name',
  item_code: 'Item Code',
  unit: 'Unit',
  quantity: 'Quantity',
  min_required: 'Min Required',
  unit_cost: 'Unit Cost',
  location: 'Location',
  notes: 'Notes',
  machine: 'Machine (for Consumables)'
};

const DEFAULTS = {
  unit: 'pcs',
  quantity: 0,
  min_required: 0,
  unit_cost: 0,
  location: '',
  notes: '',
  machine: ''
};

export default function StockForm({ groupCode, user }) {
  const [form, setForm] = useState({ group_code: groupCode, ...DEFAULTS });
  const [mode, setMode] = useState('create');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleItemCodeResolved(item) {
    if (item) {
      setForm({ ...item });
      setMode('update');
    } else {
      setMode('create');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setToast('');
    if (mode === 'create') {
      const { error } = await supabase.from('stock_items').insert([{ ...form, group_code: groupCode }]);
      if (!error) setToast('✅ Item created');
      else setToast('❌ ' + error.message);
    } else {
      const { error } = await supabase.from('stock_items').update({ ...form, last_updated: new Date().toISOString() }).eq('id', form.id);
      if (!error) setToast('✅ Item updated');
      else setToast('❌ ' + error.message);
    }
    setLoading(false);
    setTimeout(() => setToast(''), 2500);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      {GROUP_FIELDS[groupCode].map(field => (
        field === 'item_code' ? (
          <div key={field} className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">{FIELD_LABELS[field]}</label>
            <TypedItemCodeInput
              value={form.item_code || ''}
              onChange={v => handleChange('item_code', v)}
              onResolved={handleItemCodeResolved}
              groupCode={groupCode}
              disabled={mode === 'update'}
            />
          </div>
        ) : (
          <div key={field} className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">{FIELD_LABELS[field]}</label>
            <input
              type={['quantity','min_required','unit_cost'].includes(field) ? 'number' : 'text'}
              name={field}
              value={form[field] === undefined || form[field] === null ? (['quantity','min_required','unit_cost'].includes(field) ? 0 : '') : form[field]}
              onChange={e => {
                let v = e.target.value;
                if(['quantity','min_required','unit_cost'].includes(field)) {
                  // Allow empty for user input, but store as 0
                  if (v === '' || v === null || v === undefined) {
                    handleChange(field, 0);
                    return;
                  }
                  // Convert to number and validate
                  const numValue = parseFloat(v);
                  if (!isNaN(numValue) && numValue >= 0) {
                    handleChange(field, numValue);
                  }
                  // If invalid, don't update the field
                } else {
                  handleChange(field, v);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required={['item_name','item_code','quantity'].includes(field)}
              min={['quantity','min_required','unit_cost'].includes(field) ? '0' : undefined}
              step={['unit_cost'].includes(field) ? '0.01' : '1'}
              inputMode={['quantity','min_required','unit_cost'].includes(field) ? 'numeric' : 'text'}
              pattern={['quantity','min_required','unit_cost'].includes(field) ? '[0-9]*' : undefined}
            />
          </div>
        )
      ))}
      <div className="md:col-span-2 flex gap-2 mt-2">
        <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium">
          {loading ? (mode === 'create' ? 'Creating...' : 'Updating...') : (mode === 'create' ? 'Create Item' : 'Update Item')}
        </button>
        {mode === 'update' && (
          <button type="button" className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-medium" onClick={() => { setForm({ group_code: groupCode, ...DEFAULTS }); setMode('create'); }}>Clear</button>
        )}
      </div>
      {toast && <div className="md:col-span-2 mt-2 text-center text-sm font-medium">{toast}</div>}
    </form>
  );
}
