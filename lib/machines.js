import { supabase } from './supabaseClient'

export async function getMachineSettings(machineId) {
  const { data, error } = await supabase.from('machine_settings').select('*').eq('machine_id', machineId).single()
  return { data, error }
}

export async function upsertMachineSettings({ machine_id, max_korv, maintenance, updated_by }) {
  const payload = { machine_id, max_korv, maintenance, updated_by, updated_at: new Date().toISOString() }
  const { data, error } = await supabase.from('machine_settings').upsert(payload).select('*').single()
  return { data, error }
}

export async function listMachinesSettings(machineIds = []) {
  let q = supabase.from('machine_settings').select('*')
  if (machineIds && machineIds.length) q = q.in('machine_id', machineIds)
  const { data, error } = await q
  return { data: data || [], error }
}

export async function listAssignmentsForMachine(machineId) {
  const { data, error } = await supabase
    .from('machine_assignments_view')
    .select('*')
    .eq('machine', machineId)
    .is('released_at', null)
  return { data: data || [], error }
}

export async function moveAssignments({ fromMachine, toMachine }) {
  // Move all active assignments from fromMachine to toMachine
  const { error } = await supabase
    .from('machine_assignments')
    .update({ machine: toMachine })
    .eq('machine', fromMachine)
    .is('released_at', null)
  return { error }
}