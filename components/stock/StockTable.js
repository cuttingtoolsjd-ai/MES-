// StockTable.js
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ScrapModal from './ScrapModal';
import AddIssueModal from './AddIssueModal';

const GROUP_COLUMNS = {
  FG_RG: [
    { key: 'item_name', label: 'Name' },
    { key: 'item_code', label: 'Code' },
    { key: 'quantity', label: 'Qty' },
    { key: 'status', label: 'Status' },
    { key: 'last_updated', label: 'Last Updated' },
    { key: 'actions', label: 'Actions' }
  ],
  RAW: [
    { key: 'item_code', label: 'Code' },
    { key: 'item_name', label: 'Name' },
    { key: 'quantity', label: 'Qty' },
    { key: 'min_required', label: 'Min Req.' },
    { key: 'unit', label: 'Unit' },
    { key: 'unit_cost', label: 'Unit Cost' },
    { key: 'last_updated', label: 'Last Updated' },
    { key: 'actions', label: 'Actions' }
  ],
  CONS: [
    { key: 'item_code', label: 'Code' },
    { key: 'item_name', label: 'Name' },
    { key: 'machine', label: 'Machine' },
    { key: 'quantity', label: 'Qty' },
    { key: 'min_required', label: 'Min Req.' },
    { key: 'unit', label: 'Unit' },
    { key: 'last_updated', label: 'Last Updated' },
    { key: 'actions', label: 'Actions' }
  ]
};

export default function StockTable({ groupCode, user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [scrapModal, setScrapModal] = useState({ open: false, item: null });
  const [addIssueModal, setAddIssueModal] = useState({ open: false, item: null, actionType: null });
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from('stock_items')
      .select('*')
      .eq('group_code', groupCode)
      .order('last_updated', { ascending: false })
      .then(({ data }) => {
        if (mounted) setItems(data || []);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [groupCode]);


  async function handleMoveToScrap(item, reason, qty) {
    setToast('Moving to Scrap...');
    const { error } = await supabase
      .from('stock_items')
      .update({ status: 'Scrap', last_updated: new Date().toISOString() })
      .eq('id', item.id);
    if (!error) {
      await supabase.from('scrap_items').insert({
        stock_item_id: item.id,
        reason,
        qty,
        created_by: user?.username || 'admin',
      });
      await supabase.from('stock_movements').insert({
        item_id: item.id,
        action: 'MOVE_TO_SCRAP',
        qty,
        reason,
        performed_by: user?.username || 'admin',
        from_status: item.status,
        to_status: 'Scrap',
      });
      setToast('✅ Moved to Scrap');
      setItems(items => items.map(i => i.id === item.id ? { ...i, status: 'Scrap' } : i));
    } else {
      setToast('❌ ' + error.message);
    }
    setTimeout(() => setToast(''), 2000);
  }

  async function handleAddIssueAdjust(item, qty, reason, actionType, extra = {}) {
    setToast(`${actionType}ing...`);
    let newQty = item.quantity;
    
    if (actionType === 'ADD') {
      newQty = Number(item.quantity) + Number(qty);
    } else if (actionType === 'ISSUE') {
      newQty = Number(item.quantity) - Number(qty);
      if (newQty < 0) {
        setToast('❌ Cannot issue more than available quantity');
        setTimeout(() => setToast(''), 2000);
        return;
      }
    } else if (actionType === 'ADJUST') {
      newQty = Number(qty);
      if (newQty < 0) {
        setToast('❌ Quantity cannot be negative');
        setTimeout(() => setToast(''), 2000);
        return;
      }
    }

    const { error } = await supabase
      .from('stock_items')
      .update({ quantity: newQty, last_updated: new Date().toISOString() })
      .eq('id', item.id);
    
    if (!error) {
      await supabase.from('stock_movements').insert({
        item_id: item.id,
        action: actionType,
        qty: actionType === 'ADJUST' ? newQty - item.quantity : qty,
        reason,
        work_order_id: extra?.workOrder?.id || null,
        target_type: extra?.issueMode === 'WO' ? 'WORK_ORDER' : 'OTHER',
        performed_by: user?.username || 'admin',
      });
      
      // If issuing stock to a work order, update production status to "In Progress"
      if (actionType === 'ISSUE' && extra?.workOrder?.id) {
        await supabase
          .from('work_orders')
          .update({ production_status: 'In Progress' })
          .eq('id', extra.workOrder.id)
          .eq('production_status', 'Not Started'); // Only update if not already started
      }
      
      setToast(`✅ ${actionType} completed`);
      setItems(items => items.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
    } else {
      setToast('❌ ' + error.message);
    }
    setTimeout(() => setToast(''), 2000);
  }

  function handleAction(action, item) {
    if (groupCode === 'FG_RG') {
      if (action === 'MOVE_TO_STOCK') {
        // TODO: Implement move to stock with admin approval logic
      } else if (action === 'MOVE_TO_SCRAP') {
        if (user?.role === 'manager') {
          setToast('❌ Managers cannot move items to scrap without admin approval.');
          setTimeout(() => setToast(''), 2500);
          return;
        }
        setScrapModal({ open: true, item });
      }
    } else if (groupCode === 'RAW' || groupCode === 'CONS') {
      if (["ADD", "ISSUE", "ADJUST"].includes(action)) {
        setAddIssueModal({ open: true, item, actionType: action });
      }
    }
  }

  // Filter items by search (case-insensitive, supports item name, code, po_number, customer_name, workorder_no)
  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    return (
      (item.item_name && item.item_name.toLowerCase().includes(q)) ||
      (item.item_code && item.item_code.toLowerCase().includes(q)) ||
      (item.po_number && item.po_number.toLowerCase().includes(q)) ||
      (item.customer_name && item.customer_name.toLowerCase().includes(q)) ||
      (item.workorder_no && item.workorder_no.toLowerCase().includes(q))
    );
  });

  return (
    <div className="overflow-x-auto">
      <div className="mb-2 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search item, code, PO, customer, or work order..."
          className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead>
            <tr>
              {GROUP_COLUMNS[groupCode].map(col => (
                <th key={col.key} className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr><td colSpan={GROUP_COLUMNS[groupCode].length} className="text-center py-4 text-gray-500">No items found</td></tr>
            ) : filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                {GROUP_COLUMNS[groupCode].map(col => (
                  col.key === 'actions' ? (
                    <td key={col.key} className="px-3 py-2">
                      {groupCode === 'FG_RG' && (
                        <>
                          <button className="text-green-600 hover:underline mr-2" onClick={() => handleAction('MOVE_TO_STOCK', item)}>Move to Stock</button>
                          <button className="text-red-600 hover:underline" onClick={() => handleAction('MOVE_TO_SCRAP', item)}>Move to Scrap</button>
                        </>
                      )}
                      {groupCode === 'RAW' && (
                        <>
                          <button className="text-green-600 hover:underline mr-2" onClick={() => handleAction('ADD', item)}>Add</button>
                          <button className="text-yellow-600 hover:underline mr-2" onClick={() => handleAction('ISSUE', item)}>Issue</button>
                          <button className="text-gray-600 hover:underline" onClick={() => handleAction('ADJUST', item)}>Adjust</button>
                        </>
                      )}
                      {groupCode === 'CONS' && (
                        <>
                          <button className="text-green-600 hover:underline mr-2" onClick={() => handleAction('ADD', item)}>Add</button>
                          <button className="text-yellow-600 hover:underline mr-2" onClick={() => handleAction('ISSUE', item)}>Issue</button>
                          <button className="text-gray-600 hover:underline" onClick={() => handleAction('ADJUST', item)}>Adjust</button>
                        </>
                      )}
                    </td>
                  ) : (
                    <td key={col.key} className="px-3 py-2 whitespace-nowrap">{item[col.key]}</td>
                  )
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {toast && <div className="mt-2 text-center text-sm font-medium">{toast}</div>}
      <ScrapModal
        open={scrapModal.open}
        item={scrapModal.item}
        onClose={() => setScrapModal({ open: false, item: null })}
        onSubmit={({ reason, qty }) => {
          handleMoveToScrap(scrapModal.item, reason, qty);
          setScrapModal({ open: false, item: null });
        }}
      />
      <AddIssueModal
        open={addIssueModal.open}
        item={addIssueModal.item}
        actionType={addIssueModal.actionType}
        onClose={() => setAddIssueModal({ open: false, item: null, actionType: null })}
        onSubmit={({ qty, reason, actionType, issueMode, workOrder }) => {
          handleAddIssueAdjust(addIssueModal.item, qty, reason, actionType, { issueMode, workOrder });
          setAddIssueModal({ open: false, item: null, actionType: null });
        }}
      />
    </div>
  );
}
