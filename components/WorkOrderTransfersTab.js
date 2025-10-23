import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function WorkOrderTransfersTab() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'one-way', 'two-way'
  const [operators, setOperators] = useState({}); // Map of korv -> name

  useEffect(() => {
    fetchOperators();
    fetchTransfers();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchTransfers, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchOperators() {
    const { data, error } = await supabase
      .from('users')
      .select('korv, username')
      .eq('role', 'operator');

    if (!error && data) {
      const operatorMap = {};
      data.forEach(user => {
        // Always map korv to username, even if korv is 0 or null
        operatorMap[user.korv] = user.username;
      });
      setOperators(operatorMap);
    }
  }

  async function fetchTransfers() {
    setLoading(true);
    
    // Fetch all assignments (we'll filter client-side)
    const { data, error } = await supabase
      .from('machine_assignments')
      .select(`
        id,
        machine,
        assigned_korv,
        notes,
        assigned_at,
        work_order_id,
        released_at,
        work_orders (
          work_order_no,
          tool_code,
          tool_description
        )
      `)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching transfers:', error);
      setTransfers([]);
      setLoading(false);
      return;
    }

    console.log('Total assignments fetched:', data?.length || 0);
    console.log('Sample assignments:', data?.slice(0, 3));

    // Parse and filter transfers (only active assignments with transfer_type in notes)
    const parsedTransfers = (data || [])
      .filter(item => item.released_at === null) // Only active assignments
      .map(item => {
        if (!item.notes) return null;
        try {
          const notes = JSON.parse(item.notes);
          console.log(`Assignment ${item.id} notes:`, notes);
          if (notes.transfer_type) {
            return {
              ...item,
              parsedNotes: notes
            };
          }
          return null;
        } catch (e) {
          console.error('Error parsing notes for', item.id, ':', e, 'Raw notes:', item.notes);
          return null;
        }
      })
      .filter(Boolean);

    console.log('Filtered transfers:', parsedTransfers.length, parsedTransfers);
    setTransfers(parsedTransfers);
    setLoading(false);
  }

  const filteredTransfers = transfers.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'one-way') return t.parsedNotes.transfer_type === 'one-way';
    if (filter === 'two-way') return ['two-way-out', 'two-way-in'].includes(t.parsedNotes.transfer_type);
    return true;
  });

  async function handleDeleteTransfer(id) {
    if (!confirm('Are you sure you want to delete this transfer? This cannot be undone.')) return;
    
    const { error } = await supabase
      .from('machine_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting transfer: ' + error.message);
    } else {
      alert('Transfer deleted successfully');
      fetchTransfers();
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading transfers...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-black font-sans">Work Order Transfers</h2>
          <p className="text-sm text-gray-400 font-sans">Auto-refreshes every 10 seconds</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTransfers}
            className="btn-secondary"
            title="Refresh now"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`btn-secondary ${filter === 'all' ? 'btn-primary' : ''}`}
          >
            All ({transfers.length})
          </button>
          <button
            onClick={() => setFilter('one-way')}
            className={`btn-secondary ${filter === 'one-way' ? 'btn-primary' : ''}`}
          >
            One-Way ({transfers.filter(t => t.parsedNotes.transfer_type === 'one-way').length})
          </button>
          <button
            onClick={() => setFilter('two-way')}
            className={`btn-secondary ${filter === 'two-way' ? 'btn-primary' : ''}`}
          >
            Two-Way ({transfers.filter(t => ['two-way-out', 'two-way-in'].includes(t.parsedNotes.transfer_type)).length})
          </button>
        </div>
      </div>

      {filteredTransfers.length === 0 ? (
        <div className="text-center py-12 bg-gray-200 rounded-2xl border-2 border-dashed border-silver card">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-gray-400 font-sans font-medium">No transfers found</p>
          <p className="text-sm text-gray-400 mt-2 font-sans">Operator work order transfers will appear here</p>
          <div className="mt-4 p-4 bg-white rounded-2xl border border-silver max-w-md mx-auto text-left card">
            <p className="text-sm text-black font-bold mb-2 font-sans">How to create a transfer:</p>
            <ol className="text-sm text-black space-y-1 list-decimal ml-4 font-sans">
              <li>Log in as an operator</li>
              <li>Select your machine</li>
              <li>Click "Split/Transfer" on any work order</li>
              <li>Choose one-way or two-way transfer</li>
              <li>Submit the transfer</li>
            </ol>
          </div>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-4 btn-primary"
            >
              Show All Transfers
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-silver rounded-2xl card">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider border-b border-silver font-sans">
                  Transfer Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider border-b border-silver font-sans">
                  Date/Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider border-b border-silver font-sans">
                  Work Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider border-b border-silver font-sans">
                  Tool
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider border-b border-silver font-sans">
                  Machine
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider border-b border-silver font-sans">
                  Operator
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider border-b border-silver font-sans">
                  From → To
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider border-b border-silver font-sans">
                  Work Description
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-black uppercase tracking-wider border-b border-silver font-sans">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.map(transfer => {
                const notes = transfer.parsedNotes;
                const isOneWay = notes.transfer_type === 'one-way';
                const isTwoWayOut = notes.transfer_type === 'two-way-out';
                const isTwoWayIn = notes.transfer_type === 'two-way-in';
                const woDetails = transfer.work_orders;
                // Show the username from notes.transferred_by (should be the login name)
                let operatorName = transfer.parsedNotes.transferred_by || '-';

                return (
                  <tr
                    key={transfer.id}
                    className={`border-b border-silver hover:bg-gray-200 ${
                      isOneWay ? 'bg-white' :
                      isTwoWayOut ? 'bg-white' :
                      'bg-white'
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`badge ${
                        isOneWay ? 'badge-black' :
                        isTwoWayOut ? 'badge-blue' :
                        'badge-blue'
                      }`}>
                        {isOneWay ? 'ONE-WAY' : isTwoWayOut ? '2-WAY OUT' : '2-WAY IN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-black whitespace-nowrap font-sans">
                      {new Date(transfer.assigned_at).toLocaleDateString()}<br />
                      <span className="text-xs text-gray-400">
                        {new Date(transfer.assigned_at).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-black whitespace-nowrap font-sans">
                      {woDetails?.work_order_no || transfer.work_order_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-black font-sans">
                      {woDetails?.tool_code && (
                        <>
                          <div className="font-medium">{woDetails.tool_code}</div>
                          <div className="text-xs text-gray-400">{woDetails.tool_description}</div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-black whitespace-nowrap font-sans">
                      {transfer.machine}
                    </td>
                    <td className="px-4 py-3 text-sm text-black font-sans">
                      <div className="font-medium">{operatorName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-black whitespace-nowrap font-sans">
                      {notes.from_machine && notes.to_machine ? (
                        <span className="font-medium">
                          {notes.from_machine} → {notes.to_machine}
                        </span>
                      ) : notes.from_machine ? (
                        <span>From: {notes.from_machine}</span>
                      ) : notes.to_machine ? (
                        <span>To: {notes.to_machine}</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-black max-w-xs font-sans">
                      <div className="truncate" title={notes.work_description || 'No description'}>
                        {notes.work_description || <span className="text-gray-400 italic">No description</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteTransfer(transfer.id)}
                        className="btn-secondary text-xs font-medium"
                        title="Delete this transfer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 p-4 bg-white border border-silver rounded-2xl card">
        <h3 className="font-bold text-black mb-2 font-sans">📊 Transfer Statistics</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-blue-700 font-medium font-sans">Total Transfers</div>
            <div className="text-2xl font-bold text-black font-sans">{transfers.length}</div>
          </div>
          <div>
            <div className="text-black font-medium font-sans">One-Way</div>
            <div className="text-2xl font-bold text-black font-sans">
              {transfers.filter(t => t.parsedNotes.transfer_type === 'one-way').length}
            </div>
          </div>
          <div>
            <div className="text-black font-medium font-sans">Two-Way Swaps</div>
            <div className="text-2xl font-bold text-black font-sans">
              {transfers.filter(t => ['two-way-out', 'two-way-in'].includes(t.parsedNotes.transfer_type)).length / 2}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
