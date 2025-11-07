// Simple CSV parsing & bulk import helpers without external deps (Papaparse optional)
// Expected usage: import { parseCsv, importWorkOrders, importToolMaster, importStockItems } from './csvImport'
// Each import function receives an array of row objects already normalized.

import { supabase } from './supabaseClient'

// Basic CSV parser (handles quoted fields, commas, newlines). Returns { headers, rows }
export function parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = splitCsvLine(lines[0]).map(h => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    if (cols.length === 0 || cols.every(c => c.trim() === '')) continue
    const obj = {}
    headers.forEach((h, idx) => { obj[h] = cols[idx] !== undefined ? cols[idx].trim() : '' })
    rows.push(obj)
  }
  return { headers, rows }
}

function splitCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { // escaped quote
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

// Mapping helpers: define expected column keys for each import type
const WORK_ORDER_COLUMNS = [
  'work_order_no','drawing_no','customer_name','po_number','tool_code','tool_description','quantity','price','korv_per_unit','total_korv','total_price','machine','status','assigned_to','coating_required','coating_type','marking'
]
const TOOL_MASTER_COLUMNS = [
  'tool_code','tool_description','standard_korv','cnc_time','cylindrical_time','tc_time','organisational_korv'
]
const STOCK_ITEM_COLUMNS = [
  'item_name','item_code','category','unit','quantity','min_required','unit_cost','location','notes'
]

function sanitizeNumber(v) {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

export async function importWorkOrders(rows, currentUser) {
  const payload = rows.map(r => ({
    work_order_no: r.work_order_no,
    drawing_no: r.drawing_no || null,
    customer_name: r.customer_name || null,
    po_number: r.po_number || null,
    tool_code: r.tool_code || null,
    tool_description: r.tool_description || null,
    quantity: sanitizeNumber(r.quantity),
    price: sanitizeNumber(r.price),
    korv_per_unit: sanitizeNumber(r.korv_per_unit),
    total_korv: sanitizeNumber(r.total_korv),
    total_price: sanitizeNumber(r.total_price),
    machine: r.machine || null,
    status: r.status || 'Created',
    assigned_to: r.assigned_to || null,
    created_by: currentUser?.username || 'import',
    coating_required: r.coating_required === 'yes' ? 'yes' : (r.coating_required === 'no' ? 'no' : ''),
    coating_type: r.coating_required === 'yes' ? (r.coating_type || null) : null,
    marking: r.marking || null
  }))
  let inserted = 0
  for (const chunk of chunkArray(payload, 250)) {
    const { error } = await supabase.from('work_orders').insert(chunk)
    if (error) throw new Error(error.message)
    inserted += chunk.length
  }
  return inserted
}

export async function importToolMaster(rows) {
  const payload = rows.map(r => ({
    tool_code: r.tool_code,
    tool_description: r.tool_description || null,
    standard_korv: sanitizeNumber(r.standard_korv),
    cnc_time: sanitizeNumber(r.cnc_time) || 0,
    cylindrical_time: sanitizeNumber(r.cylindrical_time) || 0,
    tc_time: sanitizeNumber(r.tc_time) || 0,
    organisational_korv: sanitizeNumber(r.organisational_korv)
  }))
  let inserted = 0
  for (const chunk of chunkArray(payload, 250)) {
    const { error } = await supabase.from('tool_master').insert(chunk)
    if (error) throw new Error(error.message)
    inserted += chunk.length
  }
  return inserted
}

export async function importStockItems(rows) {
  const payload = rows.map(r => ({
    item_name: r.item_name,
    item_code: r.item_code,
    category: r.category || null,
    unit: r.unit || null,
    quantity: sanitizeNumber(r.quantity),
    min_required: sanitizeNumber(r.min_required),
    unit_cost: sanitizeNumber(r.unit_cost),
    location: r.location || null,
    notes: r.notes || null
  }))
  let inserted = 0
  for (const chunk of chunkArray(payload, 250)) {
    const { error } = await supabase.from('stock_items').insert(chunk)
    if (error) throw new Error(error.message)
    inserted += chunk.length
  }
  return inserted
}

export function detectImportType(headers) {
  const set = new Set(headers.map(h => h.toLowerCase()))
  const matchesAll = cols => cols.every(c => set.has(c.toLowerCase()))
  if (matchesAll(WORK_ORDER_COLUMNS.slice(0,5))) return 'work_orders'
  if (matchesAll(TOOL_MASTER_COLUMNS.slice(0,2))) return 'tool_master'
  if (matchesAll(STOCK_ITEM_COLUMNS.slice(0,3))) return 'stock_items'
  return 'unknown'
}

function chunkArray(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
