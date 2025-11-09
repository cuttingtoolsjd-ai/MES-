import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function EnquiryBoard({ user }) {
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ customer_id: '', title: '', details: '', need_sales_help: false, need_tech_help: false })

  async function fetchEnquiries() {
    setLoading(true)
    const { data, error } = await supabase
      .from('enquiries')
      .select('*, customers(name)')
      .order('created_at', { ascending: false })
    if (!error) setEnquiries(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchEnquiries() }, [])

  function onChange(e) {
    const { name, value, type, checked } = e.target
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setMessage('')
    const payload = {
      customer_id: form.customer_id || null,
      title: form.title,
      details: form.details,
      marketing_user_id: user?.id || null,
      need_sales_help: !!form.need_sales_help,
      need_tech_help: !!form.need_tech_help
    }
    const { error } = await supabase.from('enquiries').insert([payload])
    if (error) setMessage('Error: ' + error.message)
    else { setMessage('✅ Enquiry logged'); setForm({ customer_id: '', title: '', details: '', need_sales_help: false, need_tech_help: false }); fetchEnquiries() }
  }

  async function addAction(enquiry_id, role, action, notes) {
  const { error } = await supabase.from('enquiry_actions').insert([{ enquiry_id, actor_user_id: user?.id || null, role, action, notes }])
    if (error) setMessage('Error: ' + error.message); else { setMessage('✅ Action recorded'); fetchEnquiries() }
  }

  async function closeEnquiry(id) { await addAction(id, 'marketing', 'closed', 'Closed by marketing'); await supabase.from('enquiries').update({ status: 'closed' }).eq('id', id); fetchEnquiries() }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Enquiries</h3>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input name="customer_id" value={form.customer_id} onChange={onChange} placeholder="Customer ID (optional)" className="border rounded px-2 py-1" />
        <input name="title" value={form.title} onChange={onChange} placeholder="Title" className="border rounded px-2 py-1" required />
        <div className="flex items-center gap-4">
          <label className="text-sm"><input type="checkbox" name="need_sales_help" checked={form.need_sales_help} onChange={onChange} className="mr-1" />Sales help (quotation)</label>
          <label className="text-sm"><input type="checkbox" name="need_tech_help" checked={form.need_tech_help} onChange={onChange} className="mr-1" />Tech help (geometry)</label>
        </div>
        <textarea name="details" value={form.details} onChange={onChange} placeholder="Details" className="border rounded px-2 py-1 md:col-span-3" />
        <div className="md:col-span-3"><button className="px-3 py-2 bg-indigo-600 text-white rounded">Log Enquiry</button></div>
      </form>
      {message && <div className={`mb-3 text-sm ${message.startsWith('✅') ? 'text-green-700' : 'text-red-700'}`}>{message}</div>}
      {loading ? <div>Loading...</div> : (
        <div className="space-y-3">
          {enquiries.map(e => (
            <div key={e.id} className="border rounded p-3">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{e.title}</div>
                  <div className="text-xs text-gray-500">Customer: {e.customers?.name || 'Prospect'} • Status: {e.status}</div>
                </div>
                <div className="flex gap-2">
                  {e.need_sales_help && <button onClick={() => addAction(e.id, 'sales', 'quotation-provided', 'Quotation prepared')} className="text-xs px-2 py-1 bg-green-600 text-white rounded">Sales: Quotation</button>}
                  {e.need_tech_help && <button onClick={() => addAction(e.id, 'tech', 'geometry-provided', 'Geometry shared')} className="text-xs px-2 py-1 bg-blue-600 text-white rounded">Tech: Geometry</button>}
                  <button onClick={() => closeEnquiry(e.id)} className="text-xs px-2 py-1 bg-gray-200 rounded">Close</button>
                </div>
              </div>
              {e.details && <div className="text-sm mt-2 whitespace-pre-wrap">{e.details}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
