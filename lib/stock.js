import { supabase } from './supabaseClient'

// Utility: normalize error return
function result(data, error) {
  if (error) return { data: null, error }
  return { data, error: null }
}

// Simple predicate for open work orders
export function isWorkOrderOpen(status = '') {
  const s = String(status || '').toLowerCase()
  return !['completed', 'done', 'closed', 'released'].includes(s)
}

// Fetch a stock item by id
export async function getStockItemById(itemId) {
  const { data, error } = await supabase.from('stock_items').select('*').eq('id', itemId).single()
  return result(data, error)
}

// List stock items with optional filters
export async function listStock({ groupCode, search = '', limit = 100, orderBy = 'last_updated', ascending = false } = {}) {
  let q = supabase.from('stock_items').select('*')
  if (groupCode) q = q.eq('group_code', groupCode)
  if (orderBy) q = q.order(orderBy, { ascending })
  if (limit) q = q.limit(limit)
  const { data, error } = await q
  if (error) return result([], error)
  const term = String(search || '').toLowerCase()
  const filtered = term
    ? (data || []).filter((i) =>
        [i.item_name, i.item_code, i.location, i.status, i.machine]
          .filter(Boolean)
          .join(' ') 
          .toLowerCase()
          .includes(term)
      )
    : data || []
  return result(filtered, null)
}

// List work orders minimal info (open-first filtering done client-side as well)
export async function listWorkOrdersSimple(search = '', limit = 50) {
  const { data, error } = await supabase
    .from('work_orders')
    .select('id, work_order_no, tool_code, tool_description, status, created_on, customer_name')
    .order('created_on', { ascending: false })
    .limit(limit)
  if (error) return result([], error)
  const term = String(search || '').toLowerCase()
  const filtered = (data || []).filter((wo) => {
    if (!isWorkOrderOpen(wo.status)) return false
    if (!term) return true
    return (
      (wo.work_order_no || '').toLowerCase().includes(term) ||
      (wo.tool_code || '').toLowerCase().includes(term) ||
      (wo.tool_description || '').toLowerCase().includes(term) ||
      (wo.customer_name || '').toLowerCase().includes(term)
    )
  })
  return result(filtered, null)
}

// Internal: apply quantity change and return updated row
async function updateStockQuantity(itemId, newQty) {
  const { data, error } = await supabase
    .from('stock_items')
    .update({ quantity: newQty, last_updated: new Date().toISOString() })
    .eq('id', itemId)
    .select('*')
    .single()
  return result(data, error)
}

// Issue stock: decrement quantity and create movement (optionally link to work_order_id)
export async function issueStock({ itemId, qty, reason = '', workOrderId = null, performedBy = 'system' }) {
  const amount = Number(qty || 0)
  if (!itemId || !(amount > 0)) return result(null, new Error('Invalid item/qty'))
  const { data: item, error: e1 } = await getStockItemById(itemId)
  if (e1) return result(null, e1)
  const current = Number(item.quantity || 0)
  const updated = current - amount
  if (updated < 0) return result(null, new Error('Insufficient quantity'))

  const { data: updatedItem, error: e2 } = await updateStockQuantity(itemId, updated)
  if (e2) return result(null, e2)

  const movement = {
    item_id: itemId,
    action: 'ISSUE',
    qty: amount,
    reason,
    target_type: workOrderId ? 'WORK_ORDER' : 'OTHER',
    work_order_id: workOrderId,
    performed_by: performedBy,
  }
  const { data: mv, error: e3 } = await supabase.from('stock_movements').insert(movement).select('*').single()
  if (e3) return result(null, e3)
  return result({ item: updatedItem, movement: mv }, null)
}

// Add stock: increment quantity and create movement
export async function addStock({ itemId, qty, reason = '', performedBy = 'system' }) {
  const amount = Number(qty || 0)
  if (!itemId || !(amount > 0)) return result(null, new Error('Invalid item/qty'))
  const { data: item, error: e1 } = await getStockItemById(itemId)
  if (e1) return result(null, e1)
  const current = Number(item.quantity || 0)
  const updated = current + amount
  const { data: updatedItem, error: e2 } = await updateStockQuantity(itemId, updated)
  if (e2) return result(null, e2)
  const movement = {
    item_id: itemId,
    action: 'ADD',
    qty: amount,
    reason,
    target_type: 'OTHER',
    work_order_id: null,
    performed_by: performedBy,
  }
  const { data: mv, error: e3 } = await supabase.from('stock_movements').insert(movement).select('*').single()
  if (e3) return result(null, e3)
  return result({ item: updatedItem, movement: mv }, null)
}

// Adjust stock: set new absolute quantity and create movement with delta value
export async function adjustStock({ itemId, newQty, reason = '', performedBy = 'system' }) {
  if (newQty == null || newQty < 0) return result(null, new Error('Invalid newQty'))
  const { data: item, error: e1 } = await getStockItemById(itemId)
  if (e1) return result(null, e1)
  const current = Number(item.quantity || 0)
  const delta = Number(newQty) - current
  const { data: updatedItem, error: e2 } = await updateStockQuantity(itemId, Number(newQty))
  if (e2) return result(null, e2)
  const movement = {
    item_id: itemId,
    action: 'ADJUST',
    qty: delta,
    reason,
    target_type: 'OTHER',
    work_order_id: null,
    performed_by: performedBy,
  }
  const { data: mv, error: e3 } = await supabase.from('stock_movements').insert(movement).select('*').single()
  if (e3) return result(null, e3)
  return result({ item: updatedItem, movement: mv }, null)
}

// List movements with optional filters and joins
export async function listStockMovements({ workOrderId = null, itemId = null, limit = 200 } = {}) {
  let q = supabase
    .from('stock_movements')
    .select(`
      id, action, qty, reason, target_type, work_order_id, performed_by, created_at,
      stock_items:item_id ( id, item_code, item_name, group_code ),
      work_orders:work_order_id ( id, work_order_no )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (workOrderId) q = q.eq('work_order_id', workOrderId)
  if (itemId) q = q.eq('item_id', itemId)
  const { data, error } = await q
  return result(data || [], error)
}

// Reverse an ISSUE movement: mark it reversed and add back quantity.
// Contract:
// - input: movementId (uuid), performedBy
// - behavior: only allows reversing an ISSUE that is not already reversed; restores qty to stock_items; creates compensating ADD; links reversal.
export async function reverseIssueMovement({ movementId, performedBy = 'system' }) {
  // Fetch movement with joins
  const { data: mv, error: e0 } = await supabase
    .from('stock_movements')
    .select(`id, action, qty, item_id, work_order_id, reversed_at`)
    .eq('id', movementId)
    .single()
  if (e0) return result(null, e0)
  if (!mv || mv.action !== 'ISSUE') return result(null, new Error('Only ISSUE movements can be reversed'))
  if (mv.reversed_at) return result(null, new Error('Movement already reversed'))

  // Increase item quantity
  const { data: item, error: e1 } = await getStockItemById(mv.item_id)
  if (e1) return result(null, e1)
  const newQty = Number(item.quantity || 0) + Number(mv.qty || 0)
  const { data: updatedItem, error: e2 } = await supabase
    .from('stock_items')
    .update({ quantity: newQty, last_updated: new Date().toISOString() })
    .eq('id', mv.item_id)
    .select('*')
    .single()
  if (e2) return result(null, e2)

  // Create compensating ADD movement
  const addMovement = {
    item_id: mv.item_id,
    action: 'ADD',
    qty: mv.qty,
    reason: `Reversal of ISSUE ${mv.id}`,
    target_type: 'OTHER',
    work_order_id: null,
    performed_by: performedBy,
    reversal_of: mv.id,
  }
  const { data: addMv, error: e3 } = await supabase.from('stock_movements').insert(addMovement).select('*').single()
  if (e3) return result(null, e3)

  // Mark original movement as reversed
  const { data: orig, error: e4 } = await supabase
    .from('stock_movements')
    .update({ reversed_at: new Date().toISOString(), reversed_by: performedBy })
    .eq('id', mv.id)
    .select('*')
    .single()
  if (e4) return result(null, e4)

  return result({ restored: updatedItem, compensating: addMv, original: orig }, null)
}
