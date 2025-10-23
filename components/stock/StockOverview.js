// StockOverview.js
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { listWorkOrdersSimple, issueStock, reverseIssueMovement } from '../../lib/stock';
import AddIssueModal from './AddIssueModal';

export default function StockOverview({ user }) {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, LOW_STOCK, FG_RG, RAW, CONS
  const [stockSearch, setStockSearch] = useState('');
  const [woSearch, setWoSearch] = useState('');
  // Issue log state
  const [showIssueLog, setShowIssueLog] = useState(true);
  const [issueLog, setIssueLog] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logFilterWO, setLogFilterWO] = useState(null);
  const [rawOnly, setRawOnly] = useState(true);
  const [issuedWOs, setIssuedWOs] = useState([]);
  const [openWOs, setOpenWOs] = useState([]);
  const [selectedWOId, setSelectedWOId] = useState(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueItem, setIssueItem] = useState(null);
  const selectedWO = openWOs.find(w => w.id === selectedWOId) || null;
  // Track work orders that have not yet been issued any stock
  const [unissuedWOs, setUnissuedWOs] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Tab state: STOCK, WO_TO_ISSUE, ISSUE_LOG
  const [activeTab, setActiveTab] = useState('STOCK');
  
  // Load work orders that have not yet been issued any stock
  const loadUnissuedWOs = async () => {
    // Get all open work orders
    const { data: wos } = await listWorkOrdersSimple('', 100);
    // Get all work_order_ids that have at least one stock issue
    // Only consider a WO as issued if it has a stock issue for a RAW item (join to stock_items)
    const { data: movements, error } = await supabase
      .from('stock_movements')
      .select('work_order_id, item_id, stock_items!inner(group_code)')
      .not('work_order_id', 'is', null)
      .eq('action', 'ISSUE')
      .is('reversed_at', null)
      .eq('stock_items.group_code', 'RAW');
    // Only count movements that are for RAW items, filter out any invalid UUIDs accidentally present
    const issuedWOIds = new Set((movements || [])
      .filter(m => m?.work_order_id)
      .map(m => m.work_order_id));

    // Compute issued and unissued lists (only among open WOs)
    const issued = (wos || []).filter(wo => wo.id && issuedWOIds.has(wo.id));
    const unissued = (wos || []).filter(wo => wo.id && !issuedWOIds.has(wo.id));
    setOpenWOs(wos || []);
    setIssuedWOs(issued);
    setUnissuedWOs(unissued);
  };

  useEffect(() => {
    loadUnissuedWOs();
  }, [refreshTrigger]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from('stock_items')
      .select('*')
      .order('group_code', { ascending: true })
      .then(({ data, error }) => {
        if (mounted && !error) setAllItems(data || []);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  // Load issue log (stock movements to work orders)
  useEffect(() => {
    let mounted = true;
    async function loadLog() {
      setLogLoading(true);
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          id, action, qty, reason, target_type, work_order_id, performed_by, created_at, reversed_at, reversed_by, reversal_of,
          stock_items:item_id ( id, item_code, item_name, group_code ),
          work_orders:work_order_id ( id, work_order_no )
        `)
        .order('created_at', { ascending: false })
        .limit(200);
      if (!mounted) return;
      if (!error) {
        const rows = (data || []).filter(r => r.target_type === 'WORK_ORDER');
        setIssueLog(rows);
      } else {
        setIssueLog([]);
      }
      setLogLoading(false);
    }
    loadLog();
    return () => { mounted = false; };
  }, [refreshTrigger]);

  const filteredItems = allItems.filter(item => {
    if (filter === 'LOW_STOCK') return Number(item.quantity) < 5;
    if (filter === 'ALL') return true;
    return item.group_code === filter;
  }).filter(item => {
    if (!stockSearch) return true;
    const q = stockSearch.toLowerCase();
    return [
      item.item_code,
      item.item_name,
      item.location
    ].filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  const groupNames = {
    FG_RG: 'Finished/Rejected',
    RAW: 'Raw Material', 
    CONS: 'Consumables'
  };

  const lowStockCount = allItems.filter(item => Number(item.quantity) < 5).length;

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b pb-2 overflow-x-auto">
        <button
          className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t whitespace-nowrap ${activeTab === 'STOCK' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          onClick={() => setActiveTab('STOCK')}
        >
          Stock
        </button>
        <button
          className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t whitespace-nowrap ${activeTab === 'WO_TO_ISSUE' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          onClick={() => setActiveTab('WO_TO_ISSUE')}
        >
          WO to Issue {unissuedWOs.length > 0 && <span className="ml-1 px-1.5 sm:px-2 py-0.5 bg-yellow-500 text-white rounded-full text-xs">{unissuedWOs.length}</span>}
        </button>
        <button
          className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t whitespace-nowrap ${activeTab === 'ISSUE_LOG' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          onClick={() => setActiveTab('ISSUE_LOG')}
        >
          Issue Log
        </button>
      </div>

      {/* Stock Overview Tab */}
      {activeTab === 'STOCK' && (
        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Stock Overview</h2>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={stockSearch}
                onChange={e => setStockSearch(e.target.value)}
                placeholder="Search..."
                className="px-2 sm:px-3 py-1.5 border rounded text-xs sm:text-sm flex-1 sm:w-64"
              />
              {stockSearch && (
                <button className="text-xs text-blue-700 underline whitespace-nowrap" onClick={() => setStockSearch('')}>Clear</button>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3">
            <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2 sm:pb-0">
              {['ALL', 'LOW_STOCK', 'FG_RG', 'RAW', 'CONS'].map(f => (
                <button
                  key={f}
                  className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium whitespace-nowrap ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'LOW_STOCK' ? `Low (${lowStockCount})` : (groupNames[f] || f)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">Issue to WO:</label>
              <select
                value={selectedWOId || ''}
                onChange={e => setSelectedWOId(e.target.value || null)}
                className="px-2 py-1 text-xs sm:text-sm border rounded flex-1 sm:flex-none"
              >
                <option value="">Select WO</option>
                {openWOs.map(wo => (
                  <option key={wo.id} value={wo.id}>{wo.work_order_no} — {wo.tool_code}</option>
                ))}
              </select>
              {selectedWOId && (
                <button className="text-xs text-blue-700 underline" onClick={()=>setSelectedWOId(null)}>Clear</button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading stock overview...</div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700">Group</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700">Code</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700 hidden sm:table-cell">Name</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700">Qty</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700 hidden md:table-cell">Min</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700 hidden lg:table-cell">Unit</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700 hidden lg:table-cell">Location</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700 hidden md:table-cell">Status</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-gray-500">
                        {filter === 'LOW_STOCK' ? 'No low stock items found' : 'No items found'}
                      </td>
                    </tr>
                  ) : filteredItems.map(item => {
                    const isLowStock = Number(item.quantity) < 5;
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${isLowStock ? 'bg-red-50' : ''}`}>
                        <td className="py-2 px-2 sm:px-3">
                          <span className="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800">
                            {groupNames[item.group_code]}
                          </span>
                        </td>
                        <td className="py-2 px-2 sm:px-3">
                          <div className="font-mono text-[10px] sm:text-xs">{item.item_code}</div>
                          <div className="text-[10px] text-gray-600 sm:hidden">{item.item_name}</div>
                        </td>
                        <td className="py-2 px-2 sm:px-3 hidden sm:table-cell">{item.item_name}</td>
                        <td className={`py-2 px-2 sm:px-3 font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.quantity}
                          {isLowStock && <span className="ml-1 text-red-500">⚠️</span>}
                        </td>
                        <td className="py-2 px-2 sm:px-3 text-gray-600 hidden md:table-cell">{item.min_required || '-'}</td>
                        <td className="py-2 px-2 sm:px-3 text-gray-600 hidden lg:table-cell">{item.unit || 'pcs'}</td>
                        <td className="py-2 px-2 sm:px-3 text-gray-600 hidden lg:table-cell">{item.location || '-'}</td>
                        <td className="py-2 px-2 sm:px-3 hidden md:table-cell">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            item.status === 'Active' ? 'bg-green-100 text-green-800' : 
                            item.status === 'Scrap' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-2 px-2 sm:px-3">
                          {item.group_code === 'RAW' ? (
                            <button
                              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded ${selectedWO ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                              disabled={!selectedWO}
                              onClick={() => { setIssueItem(item); setIssueModalOpen(true); }}
                            >
                              Issue
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-blue-800">Total Items</h3>
              <p className="text-xl sm:text-2xl font-bold text-blue-900">{allItems.length}</p>
            </div>
            <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-red-800">Low Stock</h3>
              <p className="text-xl sm:text-2xl font-bold text-red-900">{lowStockCount}</p>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-green-800">FG/RG Items</h3>
              <p className="text-xl sm:text-2xl font-bold text-green-900">{allItems.filter(i => i.group_code === 'FG_RG').length}</p>
            </div>
            <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-yellow-800">Raw + Cons</h3>
              <p className="text-xl sm:text-2xl font-bold text-yellow-900">{allItems.filter(i => ['RAW', 'CONS'].includes(i.group_code)).length}</p>
            </div>
          </div>
        </>
      )}

      {/* WO to Issue Tab */}
      {activeTab === 'WO_TO_ISSUE' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">WO Not Yet Issued</h2>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={woSearch}
                onChange={e => setWoSearch(e.target.value)}
                placeholder="Search..."
                className="px-2 sm:px-3 py-1.5 border rounded text-xs sm:text-sm flex-1 sm:w-64"
              />
              {woSearch && (
                <button className="text-xs text-blue-700 underline" onClick={() => setWoSearch('')}>Clear</button>
              )}
              <button 
                onClick={() => setRefreshTrigger(t => t + 1)}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 whitespace-nowrap"
              >
                Refresh
              </button>
            </div>
          </div>
          {unissuedWOs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">✓</div>
              <div className="text-sm sm:text-base">All open work orders have been issued stock</div>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700">WO No.</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700 hidden sm:table-cell">Customer</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700">Tool Code</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700 hidden md:table-cell">Description</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700 hidden lg:table-cell">Created</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unissuedWOs
                    .filter(wo => {
                      if (!woSearch) return true;
                      const q = woSearch.toLowerCase();
                      return [
                        wo.work_order_no,
                        wo.customer_name,
                        wo.tool_code,
                        wo.tool_description
                      ].filter(Boolean).join(' ').toLowerCase().includes(q);
                    })
                    .map(wo => (
                      <tr key={wo.id} className="hover:bg-yellow-50 border-b">
                        <td className="py-2 sm:py-3 px-2 sm:px-3 font-semibold text-yellow-900">
                          <div>{wo.work_order_no}</div>
                          <div className="text-[10px] text-gray-600 sm:hidden">{wo.customer_name || '-'}</div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-3 text-gray-700 hidden sm:table-cell">
                          {wo.customer_name ? (
                            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              {wo.customer_name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-3 text-gray-700">{wo.tool_code}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-3 text-gray-700 hidden md:table-cell">{wo.tool_description}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-3 text-gray-500 hidden lg:table-cell">{wo.created_on?.slice(0,10)}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-3">
                          <button
                            className="px-2 sm:px-3 py-1 text-[10px] sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                            onClick={() => {
                              setSelectedWOId(wo.id);
                              setActiveTab('STOCK');
                            }}
                          >
                            Issue
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Issue Log Tab */}
      {activeTab === 'ISSUE_LOG' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Issue Log</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <label className="inline-flex items-center gap-2 text-xs sm:text-sm">
                <input type="checkbox" checked={rawOnly} onChange={(e)=>setRawOnly(e.target.checked)} />
                <span>Raw only</span>
              </label>
              <input
                type="text"
                value={logSearch}
                onChange={e=>setLogSearch(e.target.value)}
                placeholder="Search..."
                className="px-2 sm:px-3 py-1.5 border rounded text-xs sm:text-sm w-full sm:w-auto"
              />
              {logFilterWO && (
                <button className="text-xs text-blue-700 underline" onClick={()=>setLogFilterWO(null)}>Clear WO filter</button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            {logLoading ? (
              <div className="text-center py-4">Loading log...</div>
            ) : (
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700">Time</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700">WO</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700 hidden sm:table-cell">Item</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700">Qty</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700 hidden md:table-cell">By</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700 hidden lg:table-cell">Reason</th>
                    <th className="text-left py-2 px-2 sm:px-3 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {issueLog
                    .filter(r => (rawOnly ? (r.stock_items?.group_code === 'RAW') : true))
                    .filter(r => (logFilterWO ? (r.work_orders?.work_order_no === logFilterWO) : true))
                    .filter(r => {
                      const q = (logSearch || '').toLowerCase();
                      if (!q) return true;
                      const s = [
                        r.work_orders?.work_order_no,
                        r.stock_items?.item_code,
                        r.stock_items?.item_name,
                        r.performed_by,
                        r.reason
                      ].filter(Boolean).join(' ').toLowerCase();
                      return s.includes(q);
                    })
                    .map(row => (
                      <tr key={row.id} className={`hover:bg-gray-50 border-b ${row.reversed_at ? 'opacity-60' : ''}`}>
                        <td className="py-2 px-2 sm:px-3 text-gray-600">
                          <div className="text-[10px] sm:text-xs">{new Date(row.created_at).toLocaleDateString()}</div>
                          <div className="text-[9px] sm:text-[10px] text-gray-500">{new Date(row.created_at).toLocaleTimeString()}</div>
                        </td>
                        <td className="py-2 px-2 sm:px-3">
                          {row.work_orders?.work_order_no ? (
                            <button className="text-blue-700 hover:underline text-[10px] sm:text-xs" onClick={()=>setLogFilterWO(row.work_orders?.work_order_no)}>
                              {row.work_orders.work_order_no}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 sm:px-3 hidden sm:table-cell">
                          <div className="font-mono text-[10px]">{row.stock_items?.item_code || '-'}</div>
                          <div className="text-gray-600 text-[10px]">{row.stock_items?.item_name || '-'}</div>
                        </td>
                        <td className="py-2 px-2 sm:px-3 font-semibold">{row.qty}</td>
                        <td className="py-2 px-2 sm:px-3 hidden md:table-cell text-[10px] sm:text-xs">{row.performed_by || '-'}</td>
                        <td className="py-2 px-2 sm:px-3 text-gray-600 hidden lg:table-cell text-[10px] sm:text-xs">
                          <div>{row.reason || '-'}</div>
                          {row.reversed_at && (
                            <div className="mt-1 inline-flex items-center gap-1 text-[9px] text-red-800 bg-red-100 px-1.5 py-0.5 rounded">
                              <span>Reversed</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 sm:px-3">
                          {row.action === 'ISSUE' && !row.reversed_at ? (
                            <button
                              className="text-[10px] sm:text-xs text-red-700 hover:underline"
                              onClick={async ()=>{
                                const ok = window.confirm('Reverse this issue? This will add the quantity back to stock and mark this movement reversed.');
                                if (!ok) return;
                                const { error } = await reverseIssueMovement({ movementId: row.id, performedBy: user?.username || 'admin' });
                                if (!error) {
                                  setRefreshTrigger(t=>t+1);
                                  setShowIssueLog(false); setTimeout(()=>setShowIssueLog(true), 0);
                                }
                              }}
                            >Reverse</button>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {issueLog.length === 0 && (
                    <tr><td colSpan="7" className="py-6 text-center text-gray-500">No issues recorded</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Issue Modal */}
      <AddIssueModal
        open={!!issueModalOpen}
        onClose={() => { setIssueModalOpen(false); setIssueItem(null); }}
        onSubmit={async ({ qty, reason }) => {
          if (!issueItem || !selectedWO) return;
          const { error } = await issueStock({ itemId: issueItem.id, qty, reason, workOrderId: selectedWO.id, performedBy: user?.username || 'admin' });
          if (!error) {
            // Refresh lists and local quantities
            setAllItems(items => items.map(i => i.id === issueItem.id ? { ...i, quantity: Number(i.quantity) - Number(qty) } : i));
            setRefreshTrigger(t => t + 1);
          }
          setIssueModalOpen(false);
          setIssueItem(null);
        }}
        item={issueItem}
        actionType="ISSUE"
        presetWO={selectedWO}
      />
    </div>
  );
}