import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// Hardcoded machine list as fallback (SPIRONI and ZOLLER excluded - quality control only)
const DEFAULT_MACHINES = [
  'CNC1', 'CNC2', 'CNC3', 'CNC4', 'CNC5', 'CNC7',
  'CYLN1', 'CYLN2', 'CPX', 'TOPWORK',
  'OPG1', 'T&C1', 'T&C2',
  'COATING', 'EDM'
];

export default function WorkOrderOrderTab() {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch machine list from machine_settings
    supabase.from('machine_settings').select('machine_id').then(({ data }) => {
      if (data && data.length > 0) {
        const machineIds = data.map(m => m.machine_id);
        setMachines(machineIds);
        setSelectedMachine(machineIds[0]);
      } else {
        // Fallback to default list
        setMachines(DEFAULT_MACHINES);
        setSelectedMachine(DEFAULT_MACHINES[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedMachine) return;
    // Fetch assignments for selected machine, ordered
    // Join with work_orders table to get work order details
    supabase
      .from('machine_assignments')
      .select(`
        id, 
        work_order_id, 
        order,
        assigned_korv,
        is_active,
        started_at,
        work_orders (
          work_order_no,
          tool_code,
          quantity
        )
      `)
      .eq('machine', selectedMachine)
      .is('released_at', null)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching assignments:', error);
          setAssignments([]);
          return;
        }
        // Sort by order (nulls last), then by assigned_at
        const sorted = (data || []).sort((a, b) => {
          if (a.order === null && b.order === null) return 0;
          if (a.order === null) return 1;
          if (b.order === null) return -1;
          return a.order - b.order;
        });
        setAssignments(sorted);
      });
  }, [selectedMachine]);

  function move(idx, dir) {
    if (idx + dir < 0 || idx + dir >= assignments.length) return;
    
    // Prevent moving active work orders
    if (assignments[idx].is_active) {
      alert('⚠️ Cannot reorder active work order!\n\nThis work order is currently being worked on. Please wait for the operator to finish or pause it first.');
      return;
    }
    
    // Prevent swapping with active work order
    if (assignments[idx + dir].is_active) {
      alert('⚠️ Cannot move work order past an active one!\n\nThere is an active work order in that position. Please wait for it to finish or pause it first.');
      return;
    }
    
    const newArr = [...assignments];
    const temp = newArr[idx];
    newArr[idx] = newArr[idx + dir];
    newArr[idx + dir] = temp;
    setAssignments(newArr);
  }

  async function saveOrder() {
    setSaving(true);
    for (let i = 0; i < assignments.length; i++) {
      await supabase.from('machine_assignments').update({ order: i }).eq('id', assignments[i].id);
    }
    setSaving(false);
    alert('Order saved!');
  }

  return (
    <div>
      {/* Info banner about active work orders */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 text-lg">ℹ️</span>
          <div className="text-sm text-blue-800">
            <strong>Note:</strong> Active work orders (currently being worked on) are <strong>locked</strong> and cannot be reordered. 
            To change their position, the operator must finish or you can pause them in the "Active Work" tab.
          </div>
        </div>
      </div>

      <label className="block mb-2 font-medium">Select Machine:</label>
      <select value={selectedMachine} onChange={e => setSelectedMachine(e.target.value)} className="mb-4 px-2 py-1 border rounded">
        {machines.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">
          Found {assignments.length} work order(s) assigned to {selectedMachine}
        </div>
        {assignments.length === 0 ? (
          <div className="text-gray-500 p-4 bg-gray-50 rounded border">
            No work orders assigned to this machine.
          </div>
        ) : (
          <ul className="space-y-2">
            {assignments.map((a, idx) => {
              const woDetails = a.work_orders;
              const woNumber = woDetails?.work_order_no || a.work_order_id;
              const isActive = a.is_active;
              
              return (
                <li 
                  key={a.id} 
                  className={`flex items-center gap-2 p-3 rounded border shadow-sm ${
                    isActive 
                      ? 'bg-blue-100 border-blue-400 border-2' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <span className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">WO: {woNumber}</div>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded animate-pulse">
                          ⚡ ACTIVE - LOCKED
                        </span>
                      )}
                    </div>
                    {woDetails && (
                      <div className="text-xs text-gray-500">
                        {woDetails.tool_code && `${woDetails.tool_code} • `}
                        Qty: {woDetails.quantity} • Korv: {a.assigned_korv}
                      </div>
                    )}
                    {isActive && a.started_at && (
                      <div className="text-xs text-blue-600 mt-1">
                        Started: {new Date(a.started_at).toLocaleTimeString()}
                      </div>
                    )}
                  </span>
                  <button 
                    onClick={() => move(idx, -1)} 
                    disabled={idx === 0 || isActive} 
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                    title={isActive ? "Cannot move active work order" : "Move up"}
                  >
                    ↑
                  </button>
                  <button 
                    onClick={() => move(idx, 1)} 
                    disabled={idx === assignments.length - 1 || isActive} 
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                    title={isActive ? "Cannot move active work order" : "Move down"}
                  >
                    ↓
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <button 
        onClick={saveOrder} 
        disabled={saving || assignments.length === 0} 
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {saving ? 'Saving...' : 'Save Order'}
      </button>
    </div>
  );
}
