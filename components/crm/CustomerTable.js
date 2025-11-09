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
    const { error } = await supabase.from('customers').insert([{ ...form, assigned_sales_user_id: form.assigned_sales_user_id ? Number(form.assigned_sales_user_id) : null }])
    if (error) setMessage('Error: ' + error.message)
    else { setMessage('✅ Customer added'); setForm({ name: '', code: '', industry: '', country: '', city: '', address: '', contact_person: '', contact_email: '', contact_phone: '', assigned_sales_user_id: '' }); fetchCustomers() }
  }

  async function removeCustomer(id) {
    if (!confirm('Delete this customer?')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) setMessage('Error: ' + error.message); else fetchCustomers()
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
        <input name="contact_person" value={form.contact_person} onChange={onChange} placeholder="Contact Person" className="border rounded px-2 py-1" />
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
                <th className="p-2">Sales</th>
                <th className="p-2">Last Order</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">{c.code || '-'}</td>
                  <td className="p-2">{c.users?.username || '-'}</td>
                  <td className="p-2">{c.last_order_date || '-'}</td>
                  <td className="p-2 text-right">
                    <button onClick={() => removeCustomer(c.id)} className="text-red-600 hover:underline">Delete</button>
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
