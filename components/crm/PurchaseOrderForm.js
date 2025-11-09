import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function PurchaseOrderForm({ user }) {
  const [message, setMessage] = useState('')
  const [po, setPo] = useState({ customer_id: '', po_number: '', order_date: '', expected_delivery: '' })
  const [lines, setLines] = useState([{ tool_code: '', tool_description: '', quantity: 1, price: '', korv_per_unit: '', coating_required: 'no', coating_type: '', marking: '' }])

  function onPoChange(e) { const { name, value } = e.target; setPo(p => ({ ...p, [name]: value })) }
  function onLineChange(i, name, value) { setLines(arr => arr.map((l, idx) => idx === i ? { ...l, [name]: value } : l)) }
  function addLine() { setLines(arr => [...arr, { tool_code: '', tool_description: '', quantity: 1, price: '', korv_per_unit: '', coating_required: 'no', coating_type: '', marking: '' }]) }
  function removeLine(i) { setLines(arr => arr.filter((_, idx) => idx !== i)) }

  async function onSubmit(e) {
    e.preventDefault()
    setMessage('')
    try {
      // 1) Create PO
      const { data: poData, error: poErr } = await supabase.from('purchase_orders').insert([{
        customer_id: po.customer_id || null,
        po_number: po.po_number,
        order_date: po.order_date || null,
        expected_delivery: po.expected_delivery || null,
        created_by: user?.id || null,
        status: 'created'
      }]).select('id').single()
      if (poErr) throw new Error(poErr.message)
      const poId = poData.id
      // 2) Insert lines -> trigger will create work_orders automatically
      const payload = lines.map(l => ({
        purchase_order_id: poId,
        tool_code: l.tool_code,
        tool_description: l.tool_description,
        quantity: Number(l.quantity || 0),
        price: l.price ? Number(l.price) : null,
        korv_per_unit: l.korv_per_unit ? Number(l.korv_per_unit) : null,
        coating_required: l.coating_required || 'no',
        coating_type: (l.coating_required === 'yes') ? (l.coating_type || null) : null,
        marking: l.marking || null
      }))
      const { error: lineErr } = await supabase.from('purchase_order_lines').insert(payload)
      if (lineErr) throw new Error(lineErr.message)
      setMessage('✅ Purchase Order saved and Work Orders generated')
      setPo({ customer_id: '', po_number: '', order_date: '', expected_delivery: '' })
      setLines([{ tool_code: '', tool_description: '', quantity: 1, price: '', korv_per_unit: '', coating_required: 'no', coating_type: '', marking: '' }])
    } catch (e2) {
      setMessage('Error: ' + e2.message)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Create Purchase Order (auto-generates Work Orders)</h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input name="customer_id" value={po.customer_id} onChange={onPoChange} placeholder="Customer ID" className="border rounded px-2 py-1" required />
          <input name="po_number" value={po.po_number} onChange={onPoChange} placeholder="PO Number" className="border rounded px-2 py-1" required />
          <input type="date" name="order_date" value={po.order_date} onChange={onPoChange} className="border rounded px-2 py-1" />
          <input type="date" name="expected_delivery" value={po.expected_delivery} onChange={onPoChange} className="border rounded px-2 py-1" />
        </div>
        <div>
          <div className="font-medium mb-2">Lines</div>
          <div className="space-y-3">
            {lines.map((l, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
                <input value={l.tool_code} onChange={e => onLineChange(idx, 'tool_code', e.target.value)} placeholder="Tool Code" className="border rounded px-2 py-1" required />
                <input value={l.tool_description} onChange={e => onLineChange(idx, 'tool_description', e.target.value)} placeholder="Description" className="border rounded px-2 py-1" />
                <input type="number" min="1" value={l.quantity} onChange={e => onLineChange(idx, 'quantity', e.target.value)} placeholder="Qty" className="border rounded px-2 py-1" required />
                <input type="number" step="0.01" value={l.price} onChange={e => onLineChange(idx, 'price', e.target.value)} placeholder="Price" className="border rounded px-2 py-1" />
                <input type="number" step="0.01" value={l.korv_per_unit} onChange={e => onLineChange(idx, 'korv_per_unit', e.target.value)} placeholder="Korv/Unit" className="border rounded px-2 py-1" />
                <select value={l.coating_required} onChange={e => onLineChange(idx, 'coating_required', e.target.value)} className="border rounded px-2 py-1">
                  <option value="no">Coating: No</option>
                  <option value="yes">Coating: Yes</option>
                </select>
                <div className="flex gap-2">
                  <input value={l.coating_type} onChange={e => onLineChange(idx, 'coating_type', e.target.value)} placeholder="Coating Type" className="border rounded px-2 py-1 flex-1" />
                  <button type="button" onClick={() => removeLine(idx)} className="px-2 py-1 bg-red-100 text-red-700 rounded">✕</button>
                </div>
                <input value={l.marking} onChange={e => onLineChange(idx, 'marking', e.target.value)} placeholder="Marking" className="border rounded px-2 py-1 md:col-span-7" />
              </div>
            ))}
            <button type="button" onClick={addLine} className="px-3 py-2 bg-gray-100 rounded">+ Add Line</button>
          </div>
        </div>
        <div><button className="px-3 py-2 bg-indigo-600 text-white rounded">Create PO</button></div>
      </form>
      {message && <div className={`mt-3 text-sm ${message.startsWith('✅') ? 'text-green-700' : 'text-red-700'}`}>{message}</div>}
    </div>
  )
}
