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
export async function createAssignment({ work_order_id, machine, day, shift, dept, amount }) {
  const totalKorv = Number(amount || 0)
  const notes = { dept, day, shift }
  const payload = {
    work_order_id,
    machine,
    assigned_korv: totalKorv,
    status: 'assigned',
    notes: JSON.stringify(notes),
  }
  const { data, error } = await supabase
    .from('machine_assignments')
    .insert([payload])
    .select('*')
    .single()
  return { data, error }
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
export async function listAssignmentsByMachine(machineId) {
  const { data, error } = await supabase
    .from('machine_assignments_view')
    .select('*')
    .eq('machine', machineId)
    .is('released_at', null)
  return { data: data || [], error }
}
