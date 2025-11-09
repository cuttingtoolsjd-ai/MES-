import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function CustomerTable({ user }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    name: '', code: '', industry: '', country: '', city: '', address: '',
    contact_person: '', contact_email: '', contact_phone: '', assigned_sales_user_id: ''
  })
  const [savingReasonId, setSavingReasonId] = useState(null)

  async function fetchCustomers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*, users:assigned_sales_user_id(id, username)')
      .order('name', { ascending: true })
    if (!error) setCustomers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCustomers() }, [])

  function onChange(e) { const { name, value } = e.target; setForm(p => ({ ...p, [name]: value })) }

  async function onSubmit(e) {
    e.preventDefault()
    setMessage('')
  const { error } = await supabase.from('customers').insert([{ ...form, assigned_sales_user_id: form.assigned_sales_user_id || null }])
    if (error) setMessage('Error: ' + error.message)
    else { setMessage('✅ Customer added'); setForm({ name: '', code: '', industry: '', country: '', city: '', address: '', contact_person: '', contact_email: '', contact_phone: '', assigned_sales_user_id: '' }); fetchCustomers() }
  }

  async function removeCustomer(id) {
    if (!confirm('Delete this customer?')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) setMessage('Error: ' + error.message); else fetchCustomers()
  }

  function daysSince(dateStr) {
    if (!dateStr) return Infinity
    const d = new Date(dateStr)
    const now = new Date()
    const ms = now - d
    return Math.floor(ms / (1000 * 60 * 60 * 24))
  }

  function buildWhatsAppUrl(phone, customer) {
    const d = daysSince(customer.last_order_date)
    const recipient = customer.contact_person ? customer.contact_person : 'there'
    const period = d >= 30 ? '1 month' : `${d} days`
    const text = `Hi ${recipient}, ${customer.name} has not placed an order in the past ${period}. Would you like to reassign this customer? Note: this may affect the next appraisal cycle. If you want to complain, please do so within one week.`
    const cleaned = (phone || '').replace(/[^0-9]/g, '')
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`
  }

  async function notifyInactivity(customer) {
    try {
      setMessage('')
      // Log inactivity event
      const payload = {
        customer_id: customer.id,
        days_since_last_order: daysSince(customer.last_order_date),
        sales_user_id: customer.assigned_sales_user_id || null,
      }
      const { error } = await supabase.from('customer_inactivity_logs').insert([payload])
      if (error) {
        setMessage('Error logging inactivity: ' + error.message)
        return
      }
      const url = buildWhatsAppUrl(customer.contact_phone, customer)
      window.open(url, '_blank')
    } catch (e) {
      setMessage('Error: ' + e.message)
    }
  }

  async function logReason(customer) {
    const reason = window.prompt(`Add reason for ${customer.name} inactivity (optional):`)
    if (reason === null) return
    try {
      setSavingReasonId(customer.id)
      // Create a new log with reason if none exists today, else update the latest unresolved
      const { data: existing } = await supabase
        .from('customer_inactivity_logs')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('resolved', false)
        .order('detected_on', { ascending: false })
        .limit(1)

      if (existing && existing.length > 0) {
        const latest = existing[0]
        const { error: upErr } = await supabase
          .from('customer_inactivity_logs')
          .update({ reason_logged: reason })
          .eq('id', latest.id)
        if (upErr) setMessage('Error saving reason: ' + upErr.message)
        else setMessage('✅ Reason saved')
      } else {
        const { error: insErr } = await supabase
          .from('customer_inactivity_logs')
          .insert([{ customer_id: customer.id, days_since_last_order: daysSince(customer.last_order_date), sales_user_id: customer.assigned_sales_user_id || null, reason_logged: reason }])
        if (insErr) setMessage('Error saving reason: ' + insErr.message)
        else setMessage('✅ Reason saved')
      }
    } catch (e) {
      setMessage('Error: ' + e.message)
    } finally {
      setSavingReasonId(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Customers</h3>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input name="name" value={form.name} onChange={onChange} placeholder="Name" className="border rounded px-2 py-1" required />
        <input name="code" value={form.code} onChange={onChange} placeholder="Code" className="border rounded px-2 py-1" />
        <input name="industry" value={form.industry} onChange={onChange} placeholder="Industry" className="border rounded px-2 py-1" />
        <input name="country" value={form.country} onChange={onChange} placeholder="Country" className="border rounded px-2 py-1" />
        <input name="city" value={form.city} onChange={onChange} placeholder="City" className="border rounded px-2 py-1" />
        <input name="address" value={form.address} onChange={onChange} placeholder="Address" className="border rounded px-2 py-1" />
        <input name="contact_person" value={form.contact_person} onChange={onChange} placeholder="Contact Person" className="border rounded px-2 py-1" required />
        <input name="contact_email" type="email" value={form.contact_email} onChange={onChange} placeholder="Email" className="border rounded px-2 py-1" />
        <input name="contact_phone" value={form.contact_phone} onChange={onChange} placeholder="Phone" className="border rounded px-2 py-1" />
        <input name="assigned_sales_user_id" value={form.assigned_sales_user_id} onChange={onChange} placeholder="Assigned Sales (user id)" className="border rounded px-2 py-1" />
        <div className="md:col-span-3">
          <button className="px-3 py-2 bg-indigo-600 text-white rounded">Add Customer</button>
        </div>
      </form>
      {message && <div className={`mb-3 text-sm ${message.startsWith('✅') ? 'text-green-700' : 'text-red-700'}`}>{message}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : customers.length === 0 ? (
        <div className="text-gray-500">No customers yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50">
                <th className="p-2">Name</th>
                <th className="p-2">Code</th>
                <th className="p-2">Contact Person</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Sales</th>
                <th className="p-2">Last Order</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">{c.code || '-'}</td>
                  <td className="p-2">{c.contact_person || '-'}</td>
                  <td className="p-2">{c.contact_phone || '-'}</td>
                  <td className="p-2">{c.users?.username || '-'}</td>
                  <td className="p-2">{c.last_order_date || '-'}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-3">
                      <button onClick={() => removeCustomer(c.id)} className="text-red-600 hover:underline">Delete</button>
                      {user?.role === 'admin' && daysSince(c.last_order_date) >= 30 && c.contact_phone && (
                        <>
                          <a
                            href={buildWhatsAppUrl(c.contact_phone, c)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-green-600 hover:underline"
                            onClick={(e) => {
                              // Also log inactivity when sending message
                              e.preventDefault()
                              notifyInactivity(c)
                            }}
                          >WhatsApp</a>
                          <button onClick={() => logReason(c)} className="text-xs px-2 py-1 bg-gray-100 rounded" disabled={savingReasonId === c.id}>
                            {savingReasonId === c.id ? 'Saving…' : 'Add Reason'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
