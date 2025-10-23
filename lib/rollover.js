import { supabase } from './supabaseClient';

/**
 * Roll over incomplete assignments to the next shift
 * Called when planning a new shift - checks previous shift for incomplete work
 * and automatically adds it to the current shift's planning
 */
export async function rolloverIncompleteWork(machine, currentDay, currentShift) {
  try {
    // Determine the previous shift: first -> second -> night -> (next day) first
    const shiftOrder = ['first', 'second', 'night'];
    const currentShiftIdx = shiftOrder.indexOf(currentShift);
    
    let prevDay = currentDay;
    let prevShift;
    
    if (currentShiftIdx === 0) {
      // If current is 'first', prev is 'night' from previous day
      const d = new Date(currentDay);
      d.setDate(d.getDate() - 1);
      prevDay = d.toISOString().slice(0, 10);
      prevShift = 'night';
    } else {
      prevShift = shiftOrder[currentShiftIdx - 1];
    }

    // Get all incomplete assignments from previous shift for this machine
    const { data: prevAssignments, error } = await supabase
      .from('machine_assignments')
      .select('*')
      .eq('machine', machine)
      .eq('is_completed', false)
      .eq('status', 'assigned')
      .filter('notes->>day', 'eq', prevDay)
      .filter('notes->>shift', 'eq', prevShift);

    if (error) {
      console.error('Error fetching incomplete assignments:', error);
      return { success: false, error };
    }

    if (!prevAssignments || prevAssignments.length === 0) {
      return { success: true, rolledOver: 0 };
    }

    // Create new assignments for current shift based on incomplete work
    const newAssignments = prevAssignments.map(assignment => {
      const notes = typeof assignment.notes === 'string' 
        ? JSON.parse(assignment.notes) 
        : assignment.notes;

      return {
        work_order_id: assignment.work_order_id,
        machine: assignment.machine,
        assigned_korv: assignment.assigned_korv,
        status: 'assigned',
        notes: JSON.stringify({
          ...notes,
          day: currentDay,
          shift: currentShift,
        }),
        rolled_over_from: assignment.id,
        is_completed: false,
        assigned_at: new Date().toISOString()
      };
    });

    // Insert rolled-over assignments
    const { data: inserted, error: insertError } = await supabase
      .from('machine_assignments')
      .insert(newAssignments)
      .select();

    if (insertError) {
      console.error('Error rolling over assignments:', insertError);
      return { success: false, error: insertError };
    }

    return { 
      success: true, 
      rolledOver: inserted.length,
      assignments: inserted 
    };

  } catch (err) {
    console.error('Unexpected error in rolloverIncompleteWork:', err);
    return { success: false, error: err };
  }
}

/**
 * Mark an assignment as completed
 */
export async function markAssignmentCompleted(assignmentId) {
  const { data, error } = await supabase
    .from('machine_assignments')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString()
    })
    .eq('id', assignmentId)
    .select()
    .single();

  return { data, error };
}

/**
 * Check if there are incomplete assignments for a given machine/shift
 */
export async function getIncompleteAssignments(machine, day, shift) {
  const { data, error } = await supabase
    .from('machine_assignments')
    .select('*, work_orders!inner(workorder_no, tool_code, tool_description)')
    .eq('machine', machine)
    .eq('is_completed', false)
    .eq('status', 'assigned')
    .filter('notes->>day', 'eq', day)
    .filter('notes->>shift', 'eq', shift);

  return { data: data || [], error };
}
