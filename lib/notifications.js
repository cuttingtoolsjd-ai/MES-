// Basic notification utilities (placeholder) for push + in-app events
import { supabase } from './supabaseClient'

export async function savePushSubscription(userId, { endpoint, keys }) {
  if (!userId || !endpoint || !keys) throw new Error('Invalid subscription payload')
  const { p256dh, auth } = keys
  const { error } = await supabase.from('push_subscriptions').insert([{ user_id: userId, endpoint, p256dh, auth }])
  if (error && !error.message.includes('duplicate key')) throw new Error(error.message)
}

export async function deletePushSubscription(endpoint) {
  if (!endpoint) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}

export async function logAssignment(customerId, userIds, assignedBy) {
  // Create assignment rows
  const rows = userIds.map(uid => ({ customer_id: customerId, user_id: uid, assigned_by: assignedBy }))
  const { error } = await supabase.from('customer_assignments').insert(rows)
  if (error && !error.message.includes('duplicate key')) throw new Error(error.message)
  return rows.length
}

export async function createActivityTask(userId, customerId, content, dueAt) {
  const { error } = await supabase.from('activities').insert([{ user_id: userId, customer_id: customerId, type: 'Task', content, due_at: dueAt || null }])
  if (error) throw new Error(error.message)
}
