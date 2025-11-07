import { supabase } from './supabaseClient'

// List open work orders (not completed/closed), optionally filtering by a text query
export async function listOpenWorkOrders(searchTerm = '') {
  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .order('created_on', { ascending: false })
  if (error) return { data: [], error }
  const filtered = (data || []).filter((wo) => {
    const status = (wo.status || '').toLowerCase()
    if (['completed', 'done', 'closed', 'released'].includes(status)) return false
    // Filter out work orders where factory planning has ended
    if (wo.factory_planning_ended === true) return false
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      (wo.workorder_no || '').toLowerCase().includes(q) ||
      (wo.tool_code || '').toLowerCase().includes(q) ||
      (wo.tool_description || '').toLowerCase().includes(q)
    )
  })
  return { data: filtered, error: null }
}

// List current assignments for a machine (only active ones)
export async function listAssignments(machineId) {
  const { data, error } = await supabase
    .from('machine_assignments')
    .select('*')
    .eq('machine', machineId)
    .is('released_at', null)
    .order('assigned_at', { ascending: false })
  if (error) return { data: [], error }
  return { data: data || [], error: null }
}

// Create an assignment for a specific department with a partial korv amount.
export async function createAssignment({ work_order_id, machine, day, shift, dept, amount, quantity, work_order_no, work_description, tool_code }) {
  const totalKorv = Number(amount || 0)
  const assignedQty = Number(quantity || 0)
  const notes = { dept, day, shift, work_order_no, work_description, tool_code }

  // First attempt: use the numeric value as-is (supports fractional korv if DB column is numeric)
  let payload = {
    work_order_id,
    machine: machine,
    assigned_korv: totalKorv,
    assigned_quantity: assignedQty,
    status: 'assigned',
    notes: JSON.stringify(notes),
  }

  let insert = await supabase
    .from('machine_assignments')
    .insert([payload])
    .select('*')
    .single()

  // If the DB column is still INTEGER and rejects decimals, retry by flooring the korv amount.
  if (insert.error && typeof insert.error.message === 'string' && insert.error.message.toLowerCase().includes('integer')) {
    const flooredKorv = Math.floor(totalKorv)
    payload = { ...payload, assigned_korv: flooredKorv }
    insert = await supabase
      .from('machine_assignments')
      .insert([payload])
      .select('*')
      .single()
  }

  return { data: insert.data, error: insert.error }
}

// Fetch tool master rows for a set of tool codes (used to compute per-department korv)
export async function fetchToolMasterByCodes(codes = []) {
  const unique = Array.from(new Set((codes || []).filter(Boolean)))
  if (unique.length === 0) return { data: [], error: null }
  const { data, error } = await supabase
    .from('tool_master')
    .select('tool_code, standard_korv, cnc_time, cylindrical_time, tc_time, organisational_korv')
    .in('tool_code', unique)
  return { data: data || [], error }
}

// List active assignments for an array of work orders (for computing remaining by department)
export async function listAssignmentsForWorkOrders(workOrderIds = []) {
  const unique = Array.from(new Set((workOrderIds || []).filter(Boolean)))
  if (unique.length === 0) return { data: [], error: null }
  const { data, error } = await supabase
    .from('machine_assignments')
    .select('*')
    .in('work_order_id', unique)
    .is('released_at', null)
  return { data: data || [], error }
}

// List active assignments for a given machine (used to compute available korv per shift)
// Filters by day and shift when provided
export async function listAssignmentsByMachine(machineId, day = null, shift = null) {
  let query = supabase
    .from('machine_assignments_view')
    .select('*')
    .eq('machine', machineId)
    .is('released_at', null);
  
  // Filter by day and shift from notes field
  const { data: allData, error } = await query;
  
  if (error) return { data: [], error };
  
  // If no day/shift specified, return all assignments
  if (!day && !shift) {
    return { data: allData || [], error: null };
  }
  
  // Filter by day and shift from JSON notes field
  const filtered = (allData || []).filter(a => {
    try {
      const notes = JSON.parse(a.notes || '{}');
      const matchesDay = !day || notes.day === day;
      const matchesShift = !shift || notes.shift === shift;
      return matchesDay && matchesShift;
    } catch {
      return false;
    }
  });
  
  return { data: filtered, error: null };
}
