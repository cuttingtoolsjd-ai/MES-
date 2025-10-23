import { useState, useEffect, useRef } from 'react';
import { listOpenWorkOrders, createAssignment, fetchToolMasterByCodes, listAssignmentsForWorkOrders, listAssignmentsByMachine } from '../lib/assignments';
import { supabase } from '../lib/supabaseClient';
import { getMachineSettings } from '../lib/machines';
import { rolloverIncompleteWork } from '../lib/rollover';

const BASE_W = 1200;
const BASE_H = 550;

// Absolute positions and sizes for each machine (px)
const machines = [
  { id: 'CNC5', label: 'CNC5', x: 220, y: 80, w: 90, h: 90, availableKorv: 100 },
  { id: 'CNC4', label: 'CNC4', x: 340, y: 80, w: 90, h: 90, availableKorv: 100 },
  { id: 'CNC3', label: 'CNC3', x: 460, y: 80, w: 90, h: 90, availableKorv: 100 },
  { id: 'CNC2', label: 'CNC2', x: 600, y: 180, w: 120, h: 60, availableKorv: 100 },
  { id: 'CNC1', label: 'CNC1', x: 600, y: 250, w: 120, h: 60, availableKorv: 100 },
  { id: 'CNC7', label: 'CNC7', x: 340, y: 220, w: 90, h: 90, availableKorv: 100 },
  { id: 'SPIRONI', label: 'SPIRONI', x: 180, y: 200, w: 50, h: 50, color: '#2563eb', availableKorv: 30 },
  { id: 'ZOLLER', label: 'ZOLLER', x: 240, y: 270, w: 50, h: 50, availableKorv: 30 },
  // Blue zone
  { id: 'CYLN1', label: 'CYLN1', x: 900, y: 120, w: 90, h: 120, color: '#2563eb', availableKorv: 70 },
  { id: 'CYLN2', label: 'CYLN2', x: 900, y: 260, w: 90, h: 120, color: '#2563eb', availableKorv: 70 },
  { id: 'CPX', label: 'CPX', x: 1040, y: 120, w: 90, h: 120, color: '#2563eb', availableKorv: 70 },
  { id: 'TOPWORK', label: 'TOPWORK', x: 1040, y: 260, w: 90, h: 120, color: '#2563eb', availableKorv: 70 },
  // Other
  { id: 'OPG1', label: 'OPG1', x: 60, y: 120, w: 80, h: 120, availableKorv: 60 },
  { id: 'T&C2', label: 'T&C2', x: 120, y: 400, w: 90, h: 70, availableKorv: 80 },
  { id: 'T&C1', label: 'T&C1', x: 240, y: 400, w: 90, h: 70, availableKorv: 80 },
  { id: 'COATING', label: 'COATING', x: 420, y: 400, w: 120, h: 50, faded: true, availableKorv: 40 },
  { id: 'EDM', label: 'EDM', x: 600, y: 420, w: 60, h: 60, faded: true, round: true, availableKorv: 40 },
];

const workloads = {
  CNC1: ["WO1234", "WO1235"],
  CNC2: ["WO1236"],
  CNC3: [],
  CNC4: ["WO1237"],
  CNC5: [],
  CNC7: ["WO1238", "WO1239", "WO1240"],
  'T&C1': [],
  'T&C2': [],
  OPG1: ["WO1241"],
  CYLN1: [],
  CYLN2: [],
  CPX: [],
  TOPWORK: [],
  SPIRONI: [],
  ZOLLER: [],
  COATING: [],
  EDM: [],
};

// Korv helpers
const DEFAULT_ORDER_KORV = 10;
function summarizeKorv(machineId) {
  const raw = workloads[machineId] || [];
  const orders = raw.map((o) =>
    typeof o === 'string' ? { id: o, korv: DEFAULT_ORDER_KORV } : { id: o.id, korv: o.korv ?? DEFAULT_ORDER_KORV }
  );
  const totalKorv = orders.reduce((sum, o) => sum + (Number(o.korv) || 0), 0);
  return { orders, totalKorv };
}

export default function FactoryLayout({ selectedDay, selectedShift }) {
  const [myMachine, setMyMachine] = useState(null);
  const [sidebarMachine, setSidebarMachine] = useState(null);
  const [machineSettings, setMachineSettings] = useState(null);
  const [allMachineSettings, setAllMachineSettings] = useState(new Map());
  const [search, setSearch] = useState('');
  const [openWOs, setOpenWOs] = useState([]);
  const [dept, setDept] = useState('cnc');
  const [confirmAssign, setConfirmAssign] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.7);
  const [role, setRole] = useState(null);
  const [usedKorvThisShift, setUsedKorvThisShift] = useState(0);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [draggedWO, setDraggedWO] = useState(null);
  const [machineCapacity, setMachineCapacity] = useState(new Map());

  // Load all machine settings on mount
  useEffect(() => {
    async function loadAllSettings() {
      const { data } = await supabase.from('machine_settings').select('*');
      if (data) {
        const map = new Map(data.map(s => [s.machine_id, s]));
        setAllMachineSettings(map);
      }
    }
    loadAllSettings();
  }, []);

  // Load machine settings when sidebar opens
  useEffect(() => {
    async function loadSettings() {
      if (!sidebarMachine) {
        setMachineSettings(null);
        return;
      }
      const { data } = await getMachineSettings(sidebarMachine.id);
      setMachineSettings(data || { max_korv: sidebarMachine.availableKorv || 100, maintenance: false });
    }
    loadSettings();
  }, [sidebarMachine]);

  // Responsive scale
  useEffect(() => {
    const recalc = () => {
      if (!containerRef.current) return;
      const cw = containerRef.current.clientWidth;
      const padding = 32;
      const s = Math.min(1, (cw - padding) / BASE_W);
      setScale(s > 0 ? s : 0.1);
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);

  // Determine user role
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cu = localStorage.getItem('currentUser');
        if (cu) setRole(JSON.parse(cu).role || null);
      } catch {}
    }
  }, []);

  const isManagerOrAdmin = role === 'manager' || role === 'admin';

  // Load open WOs
  async function refreshOpenWOs() {
    const { data: wos } = await listOpenWorkOrders(search);
    const toolCodes = (wos || []).map(w => w.tool_code);
    const { data: tools } = await fetchToolMasterByCodes(toolCodes);
    const toolMap = new Map((tools || []).map(t => [t.tool_code, t]));
    const enriched = (wos || []).map(w => {
      const t = toolMap.get(w.tool_code) || {};
      const qty = Number(w.quantity || 0);
      const cnc = Number(t.cnc_time || 0) * qty;
      const cyl = Number(t.cylindrical_time || 0) * qty;
  const tc = Number(t.tc_time || t.tc_estimated || 0) * qty;
      const quality = Number(t.organisational_korv || 0) * qty;
      const total = Number(t.standard_korv || 0) * qty || (cnc + cyl + tc + quality);
      return { ...w, _korv: { cnc, cyl, tc, quality, total } };
    });
    const { data: assigned } = await listAssignmentsForWorkOrders(enriched.map(e => e.id));
    const acc = new Map();
    (assigned || []).forEach(a => {
      let info = { dept: undefined };
      try { info = JSON.parse(a.notes || '{}') } catch {}
      const key = a.work_order_id;
      const prev = acc.get(key) || { cnc: 0, cyl: 0, tc: 0, quality: 0 };
      if (info.dept && prev[info.dept] !== undefined) {
        prev[info.dept] += Number(a.assigned_korv || 0);
      }
      acc.set(key, prev);
    });
    const withRemaining = enriched.map(e => {
      const used = acc.get(e.id) || { cnc: 0, cyl: 0, tc: 0, quality: 0 };
      return {
        ...e,
        _remaining: {
          cnc: Math.max(0, (e._korv.cnc || 0) - used.cnc),
          cyl: Math.max(0, (e._korv.cyl || 0) - used.cyl),
          tc: Math.max(0, (e._korv.tc || 0) - used.tc),
          quality: Math.max(0, (e._korv.quality || 0) - used.quality),
        },
      };
    });
    setOpenWOs(withRemaining);
  }

  // Load used korv for current machine/day/shift
  async function refreshUsedKorv(machine = sidebarMachine) {
    if (!machine) return;
    const { data } = await listAssignmentsByMachine(machine.id, selectedDay, selectedShift);
    const used = (data || []).reduce((sum, a) => sum + Number(a.assigned_korv || 0), 0);
    setUsedKorvThisShift(used);
    setActiveAssignments(data || []);
  }

  // Calculate capacity for all machines
  async function refreshAllMachineCapacity() {
    const capacityMap = new Map();
    for (const m of machines) {
      const { data } = await listAssignmentsByMachine(m.id, selectedDay, selectedShift);
      const used = (data || []).reduce((sum, a) => sum + Number(a.assigned_korv || 0), 0);
      const settings = allMachineSettings.get(m.id);
      const maxKorv = settings?.max_korv || m.availableKorv || 100;
      const percentage = (used / maxKorv) * 100;
      capacityMap.set(m.id, { used, maxKorv, percentage });
    }
    setMachineCapacity(capacityMap);
  }

  // Get color based on capacity percentage
  function getCapacityColor(percentage) {
    if (percentage < 30) return '#10b981'; // green
    if (percentage < 60) return '#fbbf24'; // yellow
    if (percentage < 90) return '#f97316'; // orange
    return '#ec4899'; // pink
  }

  useEffect(() => {
    refreshOpenWOs();
  }, [search]);

  useEffect(() => {
    if (sidebarMachine) {
      refreshUsedKorv();
    }
  }, [sidebarMachine, selectedDay, selectedShift]);

  useEffect(() => {
    refreshAllMachineCapacity();
  }, [selectedDay, selectedShift, allMachineSettings]);

  // Rollover incomplete work when shift/day changes
  useEffect(() => {
    async function checkAndRollover() {
      if (!selectedDay || !selectedShift) return;
      
      // Rollover for each machine
      for (const machine of machines) {
        const result = await rolloverIncompleteWork(machine.id, selectedDay, selectedShift);
        if (result.success && result.rolledOver > 0) {
          console.log(`Rolled over ${result.rolledOver} assignments for ${machine.id}`);
        }
      }
      
      // Refresh data after rollover
      await refreshAllMachineCapacity();
    }
    
    checkAndRollover();
  }, [selectedDay, selectedShift]);

  // Drag and drop handlers
  function handleDragStart(e, wo) {
    setDraggedWO(wo);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e, machine) {
    e.preventDefault();
    if (!draggedWO) return;
    
    // Open assignment prompt with the dropped WO and machine
    setSidebarMachine(machine);
    const chosenDept = dept;
    const rem = (draggedWO?._remaining && draggedWO._remaining[chosenDept]) || draggedWO.quantity || 0;
    setConfirmAssign({ 
      wo: draggedWO, 
      dept: chosenDept, 
      remaining: rem, 
      remainingQty: draggedWO.quantity || 0,
      amount: '' 
    });
    setDraggedWO(null);
  }

  function openAssignPrompt(wo) {
    const chosenDept = dept;
    const rem = (wo?._remaining && wo._remaining[chosenDept]) || 0;
    const remQty = wo.quantity || 0;
    setConfirmAssign({ 
      wo, 
      dept: chosenDept, 
      remaining: rem, 
      remainingQty: remQty,
      amount: '' 
    });
  }

  async function handleAssign(wo, amount, chosenDept) {
    if (!sidebarMachine) return;
    setAssigning(true);
    setAssignMsg('');
    const qty = Number(amount || 0);
    if (!qty || qty < 0) {
      setAssignMsg('Please enter a positive quantity.');
      setAssigning(false);
      return;
    }
    const maxRemQty = (confirmAssign && confirmAssign.remainingQty) || Infinity;
    if (qty > maxRemQty) {
      setAssignMsg('Quantity exceeds remaining quantity for this work order.');
      setAssigning(false);
      return;
    }
    if (machineSettings?.maintenance) {
      setAssignMsg('❌ Machine is under maintenance. Cannot assign.');
      setAssigning(false);
      return;
    }
    
    // Calculate korv from quantity and tool master data
    const toolCode = wo.tool_code;
    const { data: toolData } = await supabase
      .from('tool_master')
      .select('*')
      .eq('tool_code', toolCode)
      .maybeSingle();
    
    let korvForQty = 0;
    if (toolData) {
      korvForQty = Number(toolData.standard_korv || 0) * qty;
    }
    
    const maxKorv = machineSettings?.max_korv || sidebarMachine.availableKorv || 100;
    const newTotal = (usedKorvThisShift || 0) + korvForQty;
    if (newTotal > maxKorv) {
      setAssignMsg(`❌ Exceeds max korv (${maxKorv}). Currently used: ${usedKorvThisShift}, trying to add: ${korvForQty}`);
      setAssigning(false);
      return;
    }
    
    const { data, error } = await createAssignment({
      work_order_id: wo.id,
      machine: sidebarMachine.id,
      day: selectedDay || null,
      shift: selectedShift || null,
      dept: chosenDept || dept,
      amount: korvForQty,
    });
    if (error) {
      setAssignMsg('Error assigning: ' + error.message);
    } else {
      setAssignMsg(`✅ Assigned ${qty} units (${korvForQty} korv) to ${sidebarMachine.id}`);
      setConfirmAssign(null);
      await refreshOpenWOs();
      await refreshUsedKorv(sidebarMachine);
      await refreshAllMachineCapacity();
    }
    setAssigning(false);
  }

  async function handleRemoveAssignment(assignmentId) {
    if (!confirm('Remove this assignment?')) return;
    const { error } = await supabase.from('machine_assignments').delete().eq('id', assignmentId);
    if (error) {
      alert('Error removing assignment: ' + error.message);
    } else {
      await refreshOpenWOs();
      await refreshUsedKorv();
      await refreshAllMachineCapacity();
    }
  }

  async function handleRescheduleAssignment(assignmentId, currentNotes) {
    const newDay = prompt('Enter new day (YYYY-MM-DD):', currentNotes.day || '');
    if (newDay === null) return;
    const newShift = prompt('Enter new shift (day/night):', currentNotes.shift || '');
    if (newShift === null) return;
    const updatedNotes = { ...currentNotes, day: newDay, shift: newShift };
    const { error } = await supabase.from('machine_assignments').update({ notes: JSON.stringify(updatedNotes) }).eq('id', assignmentId);
    if (error) {
      alert('Error rescheduling: ' + error.message);
    } else {
      await refreshOpenWOs();
      await refreshUsedKorv();
      await refreshAllMachineCapacity();
      alert('✅ Rescheduled to ' + newDay + ' / ' + newShift);
    }
  }

  async function handleMoveAssignment(assignment, currentNotes) {
    const newMachine = prompt('Enter new machine ID (e.g., CNC2, CYLN1):', assignment.machine || '');
    if (newMachine === null) return;
    const newDay = prompt('Enter new day (YYYY-MM-DD):', currentNotes.day || '');
    if (newDay === null) return;
    const newShift = prompt('Enter new shift (day/night):', currentNotes.shift || '');
    if (newShift === null) return;
    const updatedNotes = { ...currentNotes, day: newDay, shift: newShift };
    const { error } = await supabase.from('machine_assignments').update({ machine: newMachine, notes: JSON.stringify(updatedNotes) }).eq('id', assignment.id);
    if (error) {
      alert('Error moving assignment: ' + error.message);
    } else {
      alert('✅ Moved to ' + newMachine + ' on ' + newDay + ' / ' + newShift);
      await refreshOpenWOs();
      await refreshUsedKorv();
      await refreshAllMachineCapacity();
    }
  }

  async function handleEndFactoryPlanning(workOrderId, workOrderNo) {
    if (!confirm(`Are you sure you want to end factory planning for work order ${workOrderNo}?\n\nThis will remove it from the planning list.`)) return;
    const { error } = await supabase.from('work_orders').update({ factory_planning_ended: true, factory_planning_ended_at: new Date().toISOString() }).eq('id', workOrderId);
    if (error) {
      alert('Error ending factory planning: ' + error.message);
    } else {
      alert('✅ Factory planning ended for work order ' + workOrderNo);
      await refreshOpenWOs();
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left: Open Work Orders list */}
      <aside className="w-[340px] bg-white border-r border-gray-200 overflow-y-auto p-4">
        <div className="mb-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search open WOs.." className="w-full font-sans text-black border-black border rounded-2xl px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 transition-colors" />
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="font-sans text-black border-black border rounded-2xl px-2 py-1 text-sm mt-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-700 transition-colors">
            <option value="cnc">CNC</option>
            <option value="cyl">Cylindrical</option>
            <option value="tc">T&C</option>
            <option value="quality">Quality</option>
          </select>
        </div>
        <div className="mt-2 max-h-[calc(100vh-120px)] overflow-y-auto border rounded">
          {openWOs.length === 0 ? (
            <div className="p-2 text-gray-400 text-sm">No open work orders.</div>
          ) : (
            <ul className="divide-y">
              {openWOs.map(wo => {
                const rem = wo._remaining || { cnc: 0, cyl: 0, tc: 0, quality: 0 };
                const korv = wo._korv || { cnc: 0, cyl: 0, tc: 0, quality: 0, total: 0 };
                const isCoatingRequired = wo.coating_required === 'yes';
                return (
                  <li 
                    key={wo.id} 
                    className="px-2 py-2 text-sm cursor-move hover:bg-blue-50 transition-colors"
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, wo)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">🎯 {wo.workorder_no || wo.work_order_no || wo.id}</div>
                        <div className="text-gray-500 truncate">{wo.tool_code} — {wo.tool_description}</div>
                        {isCoatingRequired && (
                          <div className="text-xs text-amber-600 mt-0.5">🎨 Coating: {wo.coating_type || 'Yes'}</div>
                        )}
                        {wo.marking && (
                          <div className="text-xs text-blue-600 mt-0.5">✏️ Marking: {wo.marking}</div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button disabled={assigning} onClick={() => openAssignPrompt(wo)} className="btn-primary text-xs w-full">
                          Assign {dept.toUpperCase()}
                        </button>
                        <button onClick={() => handleEndFactoryPlanning(wo.id, wo.workorder_no || wo.work_order_no || wo.id)} className="btn-secondary text-xs w-full mt-1" title="End factory planning for this WO">
                          End Planning
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600 grid grid-cols-2 gap-1">
                      <div>Quantity: {wo.quantity || 0}</div>
                      <div className="text-right">Total: CNC {korv.cnc} • CYL {korv.cyl} • T&C {korv.tc} • Q {korv.quality}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {assignMsg && (
          <div className={`mt-2 p-2 rounded ${assignMsg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {assignMsg}
          </div>
        )}
        {confirmAssign && (
          <div className="mt-3 p-3 border border-black rounded-2xl bg-white card">
            <div className="font-bold mb-1 text-black font-sans">Assign to {sidebarMachine?.label || 'Machine'}</div>
            <div className="text-xs text-gray-400 mb-2 font-sans">WO: {confirmAssign.wo.workorder_no || confirmAssign.wo.work_order_no || confirmAssign.wo.id} • Available Qty: {confirmAssign.remainingQty}</div>
            <div className="flex items-center gap-2 mb-2">
              <input 
                type="number" 
                min="1" 
                max={confirmAssign.remainingQty} 
                value={confirmAssign.amount} 
                onChange={(e) => setConfirmAssign(c => ({ ...c, amount: e.target.value }))} 
                placeholder="Enter quantity" 
                className="font-sans text-black border-black border rounded-2xl px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-700 transition-colors" 
                autoFocus
              />
              <button 
                disabled={assigning || !confirmAssign.amount || Number(confirmAssign.amount) <= 0} 
                onClick={() => handleAssign(confirmAssign.wo, confirmAssign.amount, (confirmAssign.dept || dept))} 
                className="btn-primary text-xs"
              >
                Assign {confirmAssign.amount || '?'} units
              </button>
              <button onClick={() => setConfirmAssign(null)} className="btn-secondary text-xs ml-auto">Cancel</button>
            </div>
            <div className="text-[11px] text-gray-400 font-sans">Drag work orders to machines or click Assign button. Enter quantity to assign.</div>
          </div>
        )}
      </aside>

      {/* Right: Factory Layout Visualization */}
      <main className="flex-1 overflow-hidden relative">
        <div ref={containerRef} className="overflow-x-auto w-full flex flex-col items-start" style={{ background: '#f8fafc', minHeight: 700 }}>
          <div style={{ width: BASE_W * scale, height: BASE_H * scale, margin: '16px auto 0' }}>
            <div style={{ position: 'relative', width: BASE_W, height: BASE_H, background: '#fff', border: '2.5px solid #222', borderRadius: 18, boxShadow: '0 8px 32px #0001', overflow: 'hidden', transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              {/* CNC Dept boundary */}
              <div style={{ position: 'absolute', left: 180, top: 40, width: 600, height: 300, border: '3px solid #bbb', borderRadius: 60, zIndex: 1 }} />
              <span style={{ position: 'absolute', left: 440, top: 30, color: '#888', fontWeight: 600, fontSize: 16 }}>CNC Dept</span>
              {/* Blue zone boundary */}
              <div style={{ position: 'absolute', left: 880, top: 80, width: 300, height: 320, border: '3px solid #2563eb', borderRadius: 18, zIndex: 1 }} />
              <span style={{ position: 'absolute', left: 1040, top: 60, color: '#2563eb', fontWeight: 600, fontSize: 14 }}>Office Block</span>

              {/* Machines */}
              {machines.map(m => {
                const isMine = myMachine === m.id;
                const isBlue = !!m.color;
                const settings = allMachineSettings.get(m.id);
                const isUnderMaintenance = settings?.maintenance || false;
                const capacity = machineCapacity.get(m.id);
                const capacityColor = capacity ? getCapacityColor(capacity.percentage) : '#10b981';
                const capacityPercentage = capacity ? Math.round(capacity.percentage) : 0;

                // Strong red for under maintenance
                const redBg = '#ef4444'; // Tailwind red-500
                const redBorder = '#b91c1c'; // Tailwind red-700

                let background, border, boxShadow, opacity;
                if (isUnderMaintenance) {
                  background = redBg;
                  border = `3px solid ${redBorder}`;
                  boxShadow = '0 0 0 6px #fecaca, 0 8px 24px #b91c1c33';
                  opacity = m.faded ? 0.5 : 0.95;
                } else if (m.faded) {
                  background = '#f3f4f6';
                  border = '3px solid #d1d5db';
                  boxShadow = '0 4px 16px #0001';
                  opacity = 0.5;
                } else if (isMine) {
                  background = 'linear-gradient(135deg, #bae6fd 60%, #38bdf8 100%)';
                  border = '3px solid #38bdf8';
                  boxShadow = '0 0 0 6px #38bdf8, 0 8px 24px #0005';
                  opacity = 1;
                } else if (isBlue) {
                  background = '#fff';
                  border = `3px solid ${m.color}`;
                  boxShadow = '0 8px 24px rgba(37,99,235,0.20)';
                  opacity = 1;
                } else {
                  background = capacityColor;
                  border = '3px solid #222';
                  boxShadow = '0 4px 16px #0003';
                  opacity = 1;
                }

                return (
                  <button
                    key={m.id}
                    style={{
                      position: 'absolute',
                      left: m.x,
                      top: m.y,
                      width: m.w,
                      height: m.h,
                      background,
                      border,
                      borderRadius: m.round ? '50%' : 14,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 14,
                      boxShadow,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.18s',
                      outline: isMine ? '2px solid #0ea5e9' : 'none',
                      outlineOffset: isMine ? 2 : 0,
                      letterSpacing: 0.5,
                      opacity,
                      zIndex: isBlue ? 3 : 2
                    }}
                    onClick={() => { setSidebarMachine(m); }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, m)}
                    title={`${m.label}${isMine ? ' (You)' : ''}${isUnderMaintenance ? ' [MAINTENANCE]' : ''} - ${capacityPercentage}% occupied`}
                  >
                    {isUnderMaintenance ? (
                      <span style={{ fontSize: 18, marginBottom: 2, filter: 'drop-shadow(0 1px 0 #0003)' }}>🔧</span>
                    ) : (
                      <span style={{ fontSize: 18, marginBottom: 2, filter: 'drop-shadow(0 1px 0 #0003)' }}>🏭</span>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{m.label}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, opacity: 0.9 }}>{capacityPercentage}%</div>
                    {isMine && <span style={{ fontSize: 9, fontWeight: 600, marginTop: 2 }}>(You)</span>}
                    {isUnderMaintenance && <span style={{ fontSize: 9, fontWeight: 600, marginTop: 2 }}>MAINT</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar for machine workload (right, persistent) */}
        {sidebarMachine && (
          <div style={{ position: 'fixed', top: 40, right: 40, width: 340, maxHeight: '80vh', background: '#fff', border: '2px solid #3b82f6', borderRadius: 18, boxShadow: '0 8px 32px #3b82f633', zIndex: 100, padding: 28, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-blue-700">{sidebarMachine.label} Workload</div>
                {machineSettings?.maintenance && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">🔧 Maintenance</span>
                )}
              </div>
              <button onClick={() => setSidebarMachine(null)} className="btn-secondary text-2xl font-bold px-3 py-0.5">×</button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 100px)' }}>
              {(() => {
                const { orders, totalKorv } = summarizeKorv(sidebarMachine.id);
                const maxKorv = machineSettings?.max_korv || sidebarMachine.availableKorv || 100;
                const availableKorv = Math.max(0, maxKorv - Number(usedKorvThisShift || 0));
                return (
                  <div>
                    {machineSettings?.maintenance && (
                      <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
                        ⚠️ Machine under maintenance. Assignments disabled.
                      </div>
                    )}
                    <div className="mb-2 flex items-center gap-3">
                      <span className="text-sm text-gray-500">Max korv (per shift)</span>
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold">{maxKorv}</span>
                    </div>
                    <div className="mb-2 flex items-center gap-3">
                      <span className="text-sm text-gray-500">Used korv (this slot)</span>
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">{usedKorvThisShift}</span>
                    </div>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="text-sm text-gray-500">Available korv</span>
                      <span className={`px-2 py-1 rounded-full text-sm font-semibold ${availableKorv > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{availableKorv}</span>
                    </div>
                    <div className="mb-2 flex items-center gap-3">
                      <span className="text-sm text-gray-500">Korv load</span>
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">{totalKorv}</span>
                    </div>
                    {orders.length > 0 ? (
                      <ul className="space-y-1 text-gray-700">
                        {orders.map(o => (
                          <li key={o.id} className="flex justify-between text-sm border-b border-gray-100 py-1">
                            <span>{o.id}</span>
                            <span className="text-blue-700 font-medium">{o.korv}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-gray-400">No work orders assigned.</div>
                    )}
                    {activeAssignments.length > 0 && (
                      <div className="mt-3 pt-2 border-t">
                        <div className="text-sm font-medium text-purple-700 mb-1">Active Assignments ({selectedDay || 'any day'}, {selectedShift || 'any shift'})</div>
                        <ul className="space-y-1 text-gray-700">
                          {activeAssignments.map(a => {
                            let notes = {};
                            try { notes = JSON.parse(a.notes || '{}'); } catch {}
                            const isTransfer = ['one-way', 'two-way-in', 'two-way-out'].includes(notes.transfer_type);
                            const isRollover = a.rolled_over_from != null;
                            return (
                              <li 
                                key={a.id} 
                                className={`border-b py-2 ${
                                  isTransfer ? 'bg-pink-50 border-pink-200 rounded px-2' : 
                                  isRollover ? 'bg-orange-50 border-orange-200 rounded px-2' : 'border-gray-100'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium">WO: {a.workorder_no || a.work_order_id}</div>
                                      {isTransfer && (
                                        <span className="px-1.5 py-0.5 bg-pink-600 text-white text-[10px] font-bold rounded">
                                          TRANSFER
                                        </span>
                                      )}
                                      {isRollover && (
                                        <span className="px-1.5 py-0.5 bg-orange-600 text-white text-[10px] font-bold rounded">
                                          ROLLOVER
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-gray-500">
                                      {a.tool_code ? `${a.tool_code} • ` : ''}
                                      {notes.work_description ? `${notes.work_description} • ` : ''}
                                      {(notes.dept || '').toUpperCase()} • {notes.day || '-'} • {notes.shift || '-'}
                                    </div>
                                    {isTransfer && notes.from_machine && (
                                      <div className="text-pink-700 text-[10px] mt-0.5">
                                        From: {notes.from_machine}
                                      </div>
                                    )}
                                  </span>
                                  <span className={`font-medium ${isTransfer ? 'text-pink-700' : 'text-purple-700'}`}>
                                    {a.assigned_korv}
                                  </span>
                                </div>
                                {isManagerOrAdmin && (
                                  <div className="flex gap-1 mt-1">
                                    <button onClick={() => handleRescheduleAssignment(a.id, notes)} className="btn-secondary text-xs px-2 py-0.5" title="Change day/shift only">
                                      Reschedule
                                    </button>
                                    <button onClick={() => handleMoveAssignment(a, notes)} className="btn-secondary text-xs px-2 py-0.5" title="Move to different machine">
                                      Move
                                    </button>
                                    <button onClick={() => handleRemoveAssignment(a.id)} className="btn-secondary text-xs px-2 py-0.5">
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
