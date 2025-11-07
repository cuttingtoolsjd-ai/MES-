import { useState, useEffect, useRef } from 'react';
import { listOpenWorkOrders, createAssignment, fetchToolMasterByCodes, listAssignmentsForWorkOrders, listAssignmentsByMachine } from '../lib/assignments';
import { supabase } from '../lib/supabaseClient';
import { getMachineSettings } from '../lib/machines';
import { rolloverIncompleteWork } from '../lib/rollover';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [tempToolTimes, setTempToolTimes] = useState(new Map()); // Store temporary time entries until planning ends

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
      
      // Get individual operation times (in minutes)
      const cncTime = Number(t.cnc_time || 0);
      const cylTime = Number(t.cylindrical_time || 0);
      const tcTime = Number(t.tc_time || t.tc_estimated || 0);
      
      // Calculate total time for all operations
      const totalTimePerUnit = cncTime + cylTime + tcTime;
      
      // Convert total time to Final KORV (1 KORV = 5 minutes)
      const finalKorvPerUnit = totalTimePerUnit / 5;
      const finalKorvTotal = finalKorvPerUnit * qty;
      
      // Also calculate per-operation KORV for tracking
      const cncKorv = (cncTime / 5) * qty;
      const cylKorv = (cylTime / 5) * qty;
      const tcKorv = (tcTime / 5) * qty;
      const quality = Number(t.organisational_korv || 0) * qty;
      
      return { 
        ...w, 
        _korv: { 
          cnc: cncKorv, 
          cyl: cylKorv, 
          tc: tcKorv, 
          quality,
          finalKorv: finalKorvTotal // This is the sum of all operations converted to KORV
        },
        _times: {
          cnc: cncTime,
          cyl: cylTime,
          tc: tcTime,
          total: totalTimePerUnit
        }
      };
    });
    const { data: assigned } = await listAssignmentsForWorkOrders(enriched.map(e => e.id));
    const korvAcc = new Map();
    const qtyAcc = new Map();
    (assigned || []).forEach(a => {
      let info = { dept: undefined };
      try { info = JSON.parse(a.notes || '{}') } catch {}
      const key = a.work_order_id;
      const prevKorv = korvAcc.get(key) || { cnc: 0, cyl: 0, tc: 0, quality: 0 };
      const prevQty = qtyAcc.get(key) || { cnc: 0, cyl: 0, tc: 0, quality: 0 };
      if (info.dept && prevKorv[info.dept] !== undefined) {
        prevKorv[info.dept] += Number(a.assigned_korv || 0);
        prevQty[info.dept] += Number(a.assigned_quantity || 0);
      }
      korvAcc.set(key, prevKorv);
      qtyAcc.set(key, prevQty);
    });
    const withRemaining = enriched.map(e => {
      const usedKorv = korvAcc.get(e.id) || { cnc: 0, cyl: 0, tc: 0, quality: 0 };
      const assignedQty = qtyAcc.get(e.id) || { cnc: 0, cyl: 0, tc: 0, quality: 0 };
      return {
        ...e,
        _remaining: {
          cnc: Math.max(0, (e._korv.cnc || 0) - usedKorv.cnc),
          cyl: Math.max(0, (e._korv.cyl || 0) - usedKorv.cyl),
          tc: Math.max(0, (e._korv.tc || 0) - usedKorv.tc),
          quality: Math.max(0, (e._korv.quality || 0) - usedKorv.quality),
        },
        _assignedQty: assignedQty,
      };
    });
    setOpenWOs(withRemaining);
  }

  // Load used korv for current machine/day/shift
  async function refreshUsedKorv(machine = sidebarMachine) {
    if (!machine) return;
    const { data } = await listAssignmentsByMachine(machine.id, selectedDay, selectedShift);
    const used = (data || []).reduce((sum, a) => sum + Number(a.assigned_korv || 0), 0);

    // Merge in assigned_quantity from base table when the view doesn't include it
    let enriched = data || [];
    try {
      const ids = enriched.map(a => a.id).filter(Boolean);
      if (ids.length > 0) {
        const { data: qtyRows } = await supabase
          .from('machine_assignments')
          .select('id, assigned_quantity')
          .in('id', ids);
        const qtyMap = new Map((qtyRows || []).map(r => [r.id, r.assigned_quantity]));
        enriched = enriched.map(a => ({ ...a, assigned_quantity: a.assigned_quantity ?? qtyMap.get(a.id) ?? null }));
      }
    } catch {}

    setUsedKorvThisShift(used);
    setActiveAssignments(enriched);
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
    const alreadyPlanned = Number(draggedWO?._assignedQty?.[chosenDept] || 0);
    const rem = Math.max(0, Number(draggedWO?.quantity || 0) - alreadyPlanned);
    setConfirmAssign({ 
      wo: draggedWO, 
      dept: chosenDept, 
      remaining: rem, 
      remainingQty: rem,
      amount: '' 
    });
    setDraggedWO(null);
  }

  function openAssignPrompt(wo) {
    if (!sidebarMachine) {
      alert('⚠️ Please select a machine first by clicking on a machine tile on the factory map.');
      return;
    }
    const chosenDept = dept;
    const alreadyPlanned = Number(wo?._assignedQty?.[chosenDept] || 0);
    const remQty = Math.max(0, Number(wo?.quantity || 0) - alreadyPlanned);
    const rem = remQty; // show same remaining for consistency
    setConfirmAssign({ 
      wo, 
      dept: chosenDept, 
      remaining: rem, 
      remainingQty: remQty,
      amount: '' 
    });
  }

  async function handleAssign(wo, amount, chosenDept, quickTime = null) {
    if (!sidebarMachine) return;
    setAssigning(true);
    setAssignMsg('');
    const qty = Number(amount || 0);
    if (!qty || qty < 0) {
      setAssignMsg('Please enter a positive quantity.');
      setAssigning(false);
      return;
    }
    const alreadyPlanned = Number((wo && wo._assignedQty && wo._assignedQty[chosenDept]) || 0);
    const maxRemQty = Math.max(0, Number(wo?.quantity || 0) - alreadyPlanned);
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
    
    // Determine if this is a regrinding work order (RE prefix)
    const isRegrindingWO = (wo.work_order_no || '').trim().toUpperCase().startsWith('RE');
    const toolCode = wo.tool_code;
    
    let korvForQty = 0;
    let timeForQty = 0; // Machine-specific time
    let machineType = getMachineType(sidebarMachine.id);
    let needsQuickTimeEntry = false;
    
    if (isRegrindingWO) {
      // For RE work orders: Look up regrinding table (only CNC time)
      const { data: regrindData } = await supabase
        .from('regrinding')
        .select('*')
        .eq('tool_code', toolCode)
        .maybeSingle();
      
      if (regrindData) {
        // For regrinding, only CNC time matters (1 KORV = 5 min)
        const cncTime = Number(regrindData.cnc_time || 0);
        timeForQty = cncTime * qty;
        korvForQty = (timeForQty / 5); // Convert time to KORV
      } else {
        // If not found in regrinding table, use WO's korv_per_unit
        korvForQty = Number(wo.korv_per_unit || 0) * qty;
      }
    } else {
      // For WO work orders: Look up tool_master and use machine-specific time
      const { data: toolData } = await supabase
        .from('tool_master')
        .select('*')
        .eq('tool_code', toolCode)
        .maybeSingle();
      
      if (toolData) {
        // Calculate machine-specific time and KORV
        const cncTime = Number(toolData.cnc_time || 0);
        const cylindricalTime = Number(toolData.cylindrical_time || 0);
        const tcTime = Number(toolData.tc_time || 0);
        
        // Check if the specific machine type has time data
        let hasTimeForMachine = false;
        if (machineType === 'cnc' && cncTime > 0) {
          hasTimeForMachine = true;
          timeForQty = cncTime * qty;
        } else if (machineType === 'cylindrical' && cylindricalTime > 0) {
          hasTimeForMachine = true;
          timeForQty = cylindricalTime * qty;
        } else if (machineType === 'tc' && tcTime > 0) {
          hasTimeForMachine = true;
          timeForQty = tcTime * qty;
        } else if (machineType === 'other' && (cncTime > 0 || cylindricalTime > 0 || tcTime > 0)) {
          hasTimeForMachine = true;
          timeForQty = (cncTime + cylindricalTime + tcTime) * qty;
        }
        
        if (hasTimeForMachine) {
          korvForQty = (timeForQty / 5); // Convert time to KORV (1 KORV = 5 min)
        } else {
          // Tool exists but no time for this machine type - need quick time entry
          const tempKey = `${toolCode}_${machineType}`;
          const tempTime = tempToolTimes.get(tempKey);
          
          if (quickTime && Number(quickTime) > 0) {
            timeForQty = Number(quickTime) * qty;
            korvForQty = (timeForQty / 5);
            
            // Store temporarily (will save to tool_master on End Planning)
            setTempToolTimes(prev => new Map(prev).set(tempKey, {
              toolCode,
              machineType,
              time: Number(quickTime),
              tool_description: wo.tool_description || ''
            }));
          } else if (tempTime) {
            // Use previously entered temp time
            timeForQty = Number(tempTime.time) * qty;
            korvForQty = (timeForQty / 5);
          } else {
            // Need user input
            needsQuickTimeEntry = true;
            setAssignMsg('⚠️ This tool has no time data for this operation. Please enter the operation time below.');
            setAssigning(false);
            setConfirmAssign(prev => prev ? { ...prev, needsQuickTime: true } : null);
            return;
          }
        }
      } else {
        // Tool not found in tool_master - check if we have quick time entry or temp storage
        const tempKey = `${toolCode}_${machineType}`;
        const tempTime = tempToolTimes.get(tempKey);
        
        if (quickTime && Number(quickTime) > 0) {
          timeForQty = Number(quickTime) * qty;
          korvForQty = (timeForQty / 5);
          
          // Store temporarily (will save to tool_master on End Planning)
          setTempToolTimes(prev => new Map(prev).set(tempKey, {
            toolCode,
            machineType,
            time: Number(quickTime),
            tool_description: wo.tool_description || ''
          }));
        } else if (tempTime) {
          // Use previously entered temp time for this tool/machine combo
          timeForQty = Number(tempTime.time) * qty;
          korvForQty = (timeForQty / 5);
        } else {
          // No tool data and no quick time - need user input
          needsQuickTimeEntry = true;
          setAssignMsg('⚠️ This tool has no time data. Please enter the operation time below.');
          setAssigning(false);
          setConfirmAssign(prev => prev ? { ...prev, needsQuickTime: true } : null);
          return;
        }
      }
    }
    
    const maxKorv = machineSettings?.max_korv || sidebarMachine.availableKorv || 100;
    const newTotal = (usedKorvThisShift || 0) + korvForQty;
    if (newTotal > maxKorv) {
      setAssignMsg(`❌ Exceeds max korv (${maxKorv}). Currently used: ${usedKorvThisShift.toFixed(2)}, trying to add: ${korvForQty.toFixed(2)}`);
      setAssigning(false);
      return;
    }
    
    // Round korv to 2 decimals for storage/UX
    const korvForQtyRounded = Math.round(korvForQty * 100) / 100;

    const { data, error } = await createAssignment({
      work_order_id: wo.id,
      machine: sidebarMachine.id,
      day: selectedDay || null,
      shift: selectedShift || null,
      dept: chosenDept || dept,
      amount: korvForQtyRounded,
      quantity: qty,
      work_order_no: wo.workorder_no || wo.work_order_no || wo.id,
      work_description: wo.tool_description || '',
      tool_code: wo.tool_code || ''
    });
    if (error) {
      setAssignMsg('Error assigning: ' + error.message);
    } else {
      // Remove time mention from notification; show only quantity and korv
      setAssignMsg(`✅ Assigned ${qty} units (${korvForQty.toFixed(2)} korv) to ${sidebarMachine.id}`);
      setConfirmAssign(null);
      await refreshOpenWOs();
      await refreshUsedKorv(sidebarMachine);
      await refreshAllMachineCapacity();
    }
    setAssigning(false);
  }
  
  // Helper function to determine machine type
  function getMachineType(machineId) {
    const id = machineId.toUpperCase();
    if (id.startsWith('CNC')) return 'cnc';
    if (id.startsWith('CYLN') || id === 'CPX' || id === 'TOPWORK') return 'cylindrical';
    if (id.startsWith('T&C') || id === 'OPG1') return 'tc';
    return 'other';
  }

  // Helper function to format shift label
  function getShiftLabel(shiftNumber) {
    const shift = Number(shiftNumber);
      if (shift === 1) return 'Shift 1 (7AM-3PM)';
      if (shift === 2) return 'Shift 2 (3PM-11PM)';
      if (shift === 3) return 'Shift 3 (11PM-7AM)';
    return `Shift ${shiftNumber}`;
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
    if (!confirm(`Are you sure you want to end factory planning for work order ${workOrderNo}?\n\nThis will finalize any temporary tool time entries and remove it from the planning list.`)) return;
    
    // First, persist any temporary tool times to tool_master
    if (tempToolTimes.size > 0) {
      // Group times by tool_code
      const toolTimesByCode = new Map();
      Array.from(tempToolTimes.values()).forEach(entry => {
        if (!toolTimesByCode.has(entry.toolCode)) {
          toolTimesByCode.set(entry.toolCode, {
            tool_code: entry.toolCode,
            tool_description: entry.tool_description,
            cnc_time: 0,
            cylindrical_time: 0,
            tc_time: 0
          });
        }
        const toolData = toolTimesByCode.get(entry.toolCode);
        if (entry.machineType === 'cnc') toolData.cnc_time = entry.time;
        if (entry.machineType === 'cylindrical') toolData.cylindrical_time = entry.time;
        if (entry.machineType === 'tc') toolData.tc_time = entry.time;
      });
      
      // Upsert each tool with all its times
      for (const [toolCode, toolData] of toolTimesByCode) {
        // Get existing tool data to preserve other operation times
        const { data: existingTool } = await supabase
          .from('tool_master')
          .select('*')
          .eq('tool_code', toolCode)
          .maybeSingle();
        
        const finalData = {
          tool_code: toolCode,
          tool_description: toolData.tool_description,
          cnc_time: toolData.cnc_time || (existingTool?.cnc_time || 0),
          cylindrical_time: toolData.cylindrical_time || (existingTool?.cylindrical_time || 0),
          tc_time: toolData.tc_time || (existingTool?.tc_time || 0)
        };
        
        // Calculate final KORV from all operation times
        finalData.standard_korv = (finalData.cnc_time + finalData.cylindrical_time + finalData.tc_time) / 5;
        
        await supabase.from('tool_master').upsert(finalData, { onConflict: 'tool_code' });
      }
      
      // Clear temporary storage
      setTempToolTimes(new Map());
    }
    
    const { error } = await supabase.from('work_orders').update({ factory_planning_ended: true, factory_planning_ended_at: new Date().toISOString() }).eq('id', workOrderId);
    if (error) {
      alert('Error ending factory planning: ' + error.message);
    } else {
      alert(`✅ Factory planning ended for work order ${workOrderNo}${tempToolTimes.size > 0 ? '\n\n✅ ' + tempToolTimes.size + ' tool time(s) saved to master data' : ''}`);
      await refreshOpenWOs();
    }
  }

  // Function to generate and download PDF
  async function generateProductionPlanPDF() {
    // Fetch ALL assignments (not just for selected machine)
    const { data: allAssignments, error } = await supabase
      .from('machine_assignments')
      .select('*')
      .is('released_at', null);
    
    if (error) {
      alert('Error loading assignments: ' + error.message);
      return;
    }
    
    // Get today's date and tomorrow's date (IST timezone)
    const istFormatter = new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
    
    const today = new Date();
    const todayParts = istFormatter.formatToParts(today);
    const todayStr = `${todayParts.find(p => p.type === 'year').value}-${todayParts.find(p => p.type === 'month').value}-${todayParts.find(p => p.type === 'day').value}`;
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowParts = istFormatter.formatToParts(tomorrow);
    const tomorrowStr = `${tomorrowParts.find(p => p.type === 'year').value}-${tomorrowParts.find(p => p.type === 'month').value}-${tomorrowParts.find(p => p.type === 'day').value}`;
    
    console.log('Today:', todayStr);
    console.log('Tomorrow:', tomorrowStr);
    console.log('Total assignments loaded:', allAssignments?.length || 0);
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Production Plan', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const generatedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(`Generated on: ${generatedDate}`, pageWidth / 2, 28, { align: 'center' });

    // Get assignments for today only (Shift 2, 3) and tomorrow Shift 1
    const getAssignmentsForDayShift = (targetDay, shift) => {
      return (allAssignments || []).filter(a => {
        try {
          const notes = JSON.parse(a.notes || '{}');
          return notes.day === targetDay && notes.shift === shift;
        } catch {
          return false;
        }
      });
    };

    const shift2Assignments = getAssignmentsForDayShift(todayStr, 2);
    const shift3Assignments = getAssignmentsForDayShift(todayStr, 3);
    const shift1TomorrowAssignments = getAssignmentsForDayShift(tomorrowStr, 1);

    // Check if there are any assignments
    if (shift2Assignments.length === 0 && shift3Assignments.length === 0 && shift1TomorrowAssignments.length === 0) {
      doc.setFontSize(12);
      doc.text('No assignments found for today\'s plan', pageWidth / 2, 50, { align: 'center' });
      doc.text(`(Today: ${todayStr} | Tomorrow: ${tomorrowStr})`, pageWidth / 2, 60, { align: 'center' });
      doc.save('Production_Plan.pdf');
      alert(`No assignments found for today's plan.\n\nToday: ${todayStr}\nTomorrow: ${tomorrowStr}`);
      return;
    }

    let yPosition = 40;

    // TODAY'S DATE HEADER
    doc.setFillColor(37, 99, 235); // Blue
    doc.rect(10, yPosition, pageWidth - 20, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(new Date(todayStr).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }), 15, yPosition + 7);
    yPosition += 15;
    
    doc.setTextColor(0, 0, 0);

    // Shift 2 (Today)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(251, 146, 60); // Orange
    doc.rect(10, yPosition, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Shift 2 (3:00 PM - 11:00 PM)', 15, yPosition + 6);
    yPosition += 12;
    doc.setTextColor(0, 0, 0);

    if (shift2Assignments.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('No assignments for Shift 2', 15, yPosition);
      yPosition += 8;
    } else {
      // Build table data with ALL assignments (not just CNC)
      const shift2Data = shift2Assignments.map(a => {
        const notes = JSON.parse(a.notes || '{}');
        return [
          a.machine || a.machine_id || '-',
          notes.work_order_no || a.work_order_id || '-',
          notes.tool_code || a.tool_code || '-',
          (notes.work_description || '-').substring(0, 30),
          a.assigned_quantity || '-'
        ];
      });

      // Filter for CNC operations only for totals
      const cncAssignments = shift2Assignments.filter(a => {
        const notes = JSON.parse(a.notes || '{}');
        return notes.operation === 'CNC' || notes.operation === 'cnc';
      });

      if (cncAssignments.length > 0) {
        // Separate RE and WO items
        const reItems = [];
        const woItems = [];

        cncAssignments.forEach(a => {
          const notes = JSON.parse(a.notes || '{}');
          const woNo = notes.work_order_no || a.work_order_id || '';
          if (woNo.includes('RE') || woNo.startsWith('RE')) {
            reItems.push(a);
          } else {
            woItems.push(a);
          }
        });

        // Calculate CNC totals
        const reTotal = reItems.reduce((sum, a) => sum + (Number(a.assigned_quantity) || 0), 0);
        const woTotal = woItems.reduce((sum, a) => sum + (Number(a.assigned_quantity) || 0), 0);

        // Add totals row
        if (reTotal > 0 || woTotal > 0) {
          shift2Data.push(['', '', '', `RE Total: ${reTotal} | WO Total: ${woTotal}`, '', '']);
        }
      }

      autoTable(doc, {
        startY: yPosition,
        head: [['Machine', 'WO No', 'Tool Code', 'Description', 'Qty']],
        body: shift2Data,
        theme: 'grid',
        headStyles: { fillColor: [254, 215, 170], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: 10, right: 10 }
      });
      yPosition = doc.lastAutoTable.finalY + 8;

      // Shift 2 Machine Overview
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(254, 237, 210); // Light orange
      doc.rect(10, yPosition, pageWidth - 20, 6, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text('Machine Overview - Shift 2', 15, yPosition + 4.5);
      yPosition += 8;

      const shift2MachineMap = {};
      shift2Assignments.forEach(a => {
        const machine = a.machine || a.machine_id || 'Unknown';
        if (!shift2MachineMap[machine]) {
          shift2MachineMap[machine] = { orders: 0, quantity: 0 };
        }
        shift2MachineMap[machine].orders += 1;
        shift2MachineMap[machine].quantity += Number(a.assigned_quantity) || 0;
      });

      const shift2OverviewData = Object.keys(shift2MachineMap).sort().map(machine => [
        machine,
        shift2MachineMap[machine].orders,
        shift2MachineMap[machine].quantity
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Machine', 'Orders', 'Qty']],
        body: shift2OverviewData,
        theme: 'grid',
        headStyles: { fillColor: [251, 146, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: 10, right: 10 }
      });
      yPosition = doc.lastAutoTable.finalY + 8;
    }

    // Shift 3 (Today)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(147, 51, 234); // Purple
    doc.rect(10, yPosition, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Shift 3 (11:00 PM - 7:00 AM)', 15, yPosition + 6);
    yPosition += 12;
    doc.setTextColor(0, 0, 0);

    if (shift3Assignments.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('No assignments for Shift 3', 15, yPosition);
      yPosition += 8;
    } else {
      // Build table data with ALL assignments (not just CNC)
      const shift3Data = shift3Assignments.map(a => {
        const notes = JSON.parse(a.notes || '{}');
        return [
          a.machine || a.machine_id || '-',
          notes.work_order_no || a.work_order_id || '-',
          notes.tool_code || a.tool_code || '-',
          (notes.work_description || '-').substring(0, 30),
          a.assigned_quantity || '-'
        ];
      });

      // Filter for CNC operations only for totals
      const cncAssignments = shift3Assignments.filter(a => {
        const notes = JSON.parse(a.notes || '{}');
        return notes.operation === 'CNC' || notes.operation === 'cnc';
      });

      if (cncAssignments.length > 0) {
        // Separate RE and WO items
        const reItems = [];
        const woItems = [];

        cncAssignments.forEach(a => {
          const notes = JSON.parse(a.notes || '{}');
          const woNo = notes.work_order_no || a.work_order_id || '';
          if (woNo.includes('RE') || woNo.startsWith('RE')) {
            reItems.push(a);
          } else {
            woItems.push(a);
          }
        });

        // Calculate CNC totals
        const reTotal = reItems.reduce((sum, a) => sum + (Number(a.assigned_quantity) || 0), 0);
        const woTotal = woItems.reduce((sum, a) => sum + (Number(a.assigned_quantity) || 0), 0);

        // Add totals row
        if (reTotal > 0 || woTotal > 0) {
          shift3Data.push(['', '', '', `RE Total: ${reTotal} | WO Total: ${woTotal}`, '', '']);
        }
      }

      autoTable(doc, {
        startY: yPosition,
        head: [['Machine', 'WO No', 'Tool Code', 'Description', 'Qty']],
        body: shift3Data,
        theme: 'grid',
        headStyles: { fillColor: [216, 180, 254], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: 10, right: 10 }
      });
      yPosition = doc.lastAutoTable.finalY + 8;

      // Shift 3 Machine Overview
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(233, 213, 255); // Light purple
      doc.rect(10, yPosition, pageWidth - 20, 6, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text('Machine Overview - Shift 3', 15, yPosition + 4.5);
      yPosition += 8;

      const shift3MachineMap = {};
      shift3Assignments.forEach(a => {
        const machine = a.machine || a.machine_id || 'Unknown';
        if (!shift3MachineMap[machine]) {
          shift3MachineMap[machine] = { orders: 0, quantity: 0 };
        }
        shift3MachineMap[machine].orders += 1;
        shift3MachineMap[machine].quantity += Number(a.assigned_quantity) || 0;
      });

      const shift3OverviewData = Object.keys(shift3MachineMap).sort().map(machine => [
        machine,
        shift3MachineMap[machine].orders,
        shift3MachineMap[machine].quantity
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Machine', 'Orders', 'Qty']],
        body: shift3OverviewData,
        theme: 'grid',
        headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: 10, right: 10 }
      });
      yPosition = doc.lastAutoTable.finalY + 8;
    }

    // NOTICE: Shift 1 is also used as General
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(219, 234, 254); // Light blue background
    doc.rect(10, yPosition, pageWidth - 20, 12, 'F');
    doc.setTextColor(30, 58, 138); // Dark blue text
    doc.text('ℹ️ Note: Shift 1 is also used as General (9:30 AM - 6:00 PM)', 15, yPosition + 8);
    yPosition += 16;

    // TOMORROW'S DATE HEADER
    doc.addPage();
    yPosition = 20;

    doc.setFillColor(37, 99, 235); // Blue
    doc.rect(10, yPosition, pageWidth - 20, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(new Date(tomorrowStr).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }), 15, yPosition + 7);
    yPosition += 15;
    
    doc.setTextColor(0, 0, 0);

    // Shift 1 (Tomorrow)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(34, 197, 94); // Green
    doc.rect(10, yPosition, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Shift 1 (7:00 AM - 3:00 PM)', 15, yPosition + 6);
    yPosition += 12;
    doc.setTextColor(0, 0, 0);

    if (shift1TomorrowAssignments.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('No assignments for Shift 1', 15, yPosition);
      yPosition += 8;
    } else {
      const shift1Data = shift1TomorrowAssignments.map(a => {
        const notes = JSON.parse(a.notes || '{}');
        return [
          a.machine || a.machine_id || '-',
          notes.work_order_no || a.work_order_id || '-',
          notes.tool_code || a.tool_code || '-',
          (notes.work_description || '-').substring(0, 30),
          a.assigned_quantity || '-'
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Machine', 'WO No', 'Tool Code', 'Description', 'Qty']],
        body: shift1Data,
        theme: 'grid',
        headStyles: { fillColor: [187, 247, 208], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: 10, right: 10 }
      });
      yPosition = doc.lastAutoTable.finalY + 8;

      // Shift 1 (Tomorrow) Machine Overview
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(220, 252, 231); // Light green
      doc.rect(10, yPosition, pageWidth - 20, 6, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text('Machine Overview - Shift 1 (Tomorrow)', 15, yPosition + 4.5);
      yPosition += 8;

      const shift1MachineMap = {};
      shift1TomorrowAssignments.forEach(a => {
        const machine = a.machine || a.machine_id || 'Unknown';
        if (!shift1MachineMap[machine]) {
          shift1MachineMap[machine] = { orders: 0, quantity: 0 };
        }
        shift1MachineMap[machine].orders += 1;
        shift1MachineMap[machine].quantity += Number(a.assigned_quantity) || 0;
      });

      const shift1OverviewData = Object.keys(shift1MachineMap).sort().map(machine => [
        machine,
        shift1MachineMap[machine].orders,
        shift1MachineMap[machine].quantity
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Machine', 'Orders', 'Qty']],
        body: shift1OverviewData,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: 10, right: 10 }
      });
      yPosition = doc.lastAutoTable.finalY + 8;
    }

    // ADD DEDICATED SECTIONS FOR CYLN AND T&C MACHINES
    doc.addPage();
    let specialMachinesY = 20;

    // CYLN MACHINES SECTION
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(10, specialMachinesY, pageWidth - 20, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CYLINDRICAL MACHINES (CYLN)', 15, specialMachinesY + 7);
    specialMachinesY += 15;
    
    doc.setTextColor(0, 0, 0);

    // Filter for CYLN assignments from all shifts
    const cylnAssignments = [
      ...shift2Assignments.filter(a => {
        const m = a.machine || a.machine_id || '';
        return m.includes('CYLN') || m.toUpperCase().includes('CYLN');
      }),
      ...shift3Assignments.filter(a => {
        const m = a.machine || a.machine_id || '';
        return m.includes('CYLN') || m.toUpperCase().includes('CYLN');
      }),
      ...shift1TomorrowAssignments.filter(a => {
        const m = a.machine || a.machine_id || '';
        return m.includes('CYLN') || m.toUpperCase().includes('CYLN');
      })
    ];

    if (cylnAssignments.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('No assignments for CYLN machines', 15, specialMachinesY);
      specialMachinesY += 8;
    } else {
      const cylnData = cylnAssignments.map(a => {
        const notes = JSON.parse(a.notes || '{}');
        return [
          a.machine || a.machine_id || '-',
          notes.work_order_no || a.work_order_id || '-',
          notes.tool_code || a.tool_code || '-',
          (notes.work_description || '-').substring(0, 25),
          a.assigned_quantity || '-'
        ];
      });

      autoTable(doc, {
        startY: specialMachinesY,
        head: [['Machine', 'WO No', 'Tool Code', 'Description', 'Qty']],
        body: cylnData,
        theme: 'grid',
        headStyles: { fillColor: [147, 197, 253], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: 10, right: 10 }
      });
      specialMachinesY = doc.lastAutoTable.finalY + 12;
    }

    // T&C MACHINES SECTION
    doc.setFillColor(168, 85, 247); // Purple
    doc.rect(10, specialMachinesY, pageWidth - 20, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('T&C MACHINES (T&C)', 15, specialMachinesY + 7);
    specialMachinesY += 15;
    
    doc.setTextColor(0, 0, 0);

    // Filter for T&C assignments from all shifts
    const tcAssignments = [
      ...shift2Assignments.filter(a => {
        const m = a.machine || a.machine_id || '';
        return (m.includes('T&C') || m.toUpperCase().includes('T&C')) || (m.includes('TC') && !m.includes('CNC'));
      }),
      ...shift3Assignments.filter(a => {
        const m = a.machine || a.machine_id || '';
        return (m.includes('T&C') || m.toUpperCase().includes('T&C')) || (m.includes('TC') && !m.includes('CNC'));
      }),
      ...shift1TomorrowAssignments.filter(a => {
        const m = a.machine || a.machine_id || '';
        return (m.includes('T&C') || m.toUpperCase().includes('T&C')) || (m.includes('TC') && !m.includes('CNC'));
      })
    ];

    if (tcAssignments.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('No assignments for T&C machines', 15, specialMachinesY);
      specialMachinesY += 8;
    } else {
      const tcData = tcAssignments.map(a => {
        const notes = JSON.parse(a.notes || '{}');
        return [
          a.machine || a.machine_id || '-',
          notes.work_order_no || a.work_order_id || '-',
          notes.tool_code || a.tool_code || '-',
          (notes.work_description || '-').substring(0, 25),
          a.assigned_quantity || '-'
        ];
      });

      autoTable(doc, {
        startY: specialMachinesY,
        head: [['Machine', 'WO No', 'Tool Code', 'Description', 'Qty']],
        body: tcData,
        theme: 'grid',
        headStyles: { fillColor: [232, 165, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: 10, right: 10 }
      });
    }

    // ADD SUMMARY PAGE WITH MACHINE AND SHIFT-WISE TOTALS
    doc.addPage();
    let summaryY = 20;

    doc.setFillColor(37, 99, 235); // Blue
    doc.rect(10, summaryY, pageWidth - 20, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Production Summary - Machine & Shift Wise Totals', 15, summaryY + 7);
    summaryY += 15;
    doc.setTextColor(0, 0, 0);

    // Collect all assignments for summary
    const allAssignmentsForSummary = [
      ...shift2Assignments.map(a => ({ ...a, shift: 2, date: 'Today' })),
      ...shift3Assignments.map(a => ({ ...a, shift: 3, date: 'Today' })),
      ...shift1TomorrowAssignments.map(a => ({ ...a, shift: 1, date: 'Tomorrow' }))
    ];

    // Group by machine and shift
    const machineShiftMap = {};
    allAssignmentsForSummary.forEach(a => {
      const machine = a.machine || a.machine_id || 'Unknown';
      const shift = a.shift;
      const key = `${machine}|${shift}`;
      
      if (!machineShiftMap[key]) {
        machineShiftMap[key] = { machine, shift, quantity: 0, count: 0 };
      }
      
      machineShiftMap[key].quantity += Number(a.assigned_quantity) || 0;
      machineShiftMap[key].count += 1;
    });

    // Convert to array and sort
    const summaryData = Object.values(machineShiftMap).sort((a, b) => {
      if (a.machine !== b.machine) return a.machine.localeCompare(b.machine);
      const shiftOrder = { 2: 1, 3: 2, 'General': 3, 1: 4 };
      return (shiftOrder[a.shift] || 999) - (shiftOrder[b.shift] || 999);
    });

    // Add summary table
    const summaryTableData = summaryData.map(s => [
      s.machine,
      `Shift ${s.shift}`,
      s.count,
      s.quantity
    ]);

    // Calculate grand totals
    let grandQty = 0;
    summaryData.forEach(s => {
      grandQty += s.quantity;
    });

    summaryTableData.push(['', 'GRAND TOTAL', '', grandQty]);

    autoTable(doc, {
      startY: summaryY,
      head: [['Machine', 'Shift', 'Jobs', 'Qty']],
      body: summaryTableData,
      theme: 'grid',
      headStyles: { fillColor: [100, 200, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, cellPadding: 2 },
      didDrawCell: (data) => {
        // Bold and color the grand total row
        if (data.row.index === summaryTableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [230, 240, 255];
        }
      },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 10, right: 10 }
    });

    // Save the PDF
    const filename = `Production_Plan_${todayStr}.pdf`;
    doc.save(filename);
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Right: Factory Layout Visualization */}
      <main className="flex-1 overflow-y-auto relative">
        <div ref={containerRef} className="overflow-x-auto w-full flex flex-col items-start" style={{ background: '#f8fafc', minHeight: 700, paddingBottom: 120 }}>
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
                const isCapacityBased = (getMachineType(m.id) === 'cylindrical') || m.id === 'COATING' || m.id === 'EDM';
                if (isUnderMaintenance) {
                  background = redBg;
                  border = `3px solid ${redBorder}`;
                  boxShadow = '0 0 0 6px #fecaca, 0 8px 24px #b91c1c33';
                  opacity = m.faded ? 0.5 : 0.95;
                } else if (isCapacityBased) {
                  // Use capacity-based infill like CNC for Cylindrical, COATING and EDM
                  background = capacityColor;
                  border = '3px solid #222';
                  boxShadow = '0 4px 16px #0003';
                  opacity = 1;
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
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">{Number(usedKorvThisShift || 0).toFixed(2)}</span>
                    </div>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="text-sm text-gray-500">Available korv</span>
                      <span className={`px-2 py-1 rounded-full text-sm font-semibold ${availableKorv > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{Number(availableKorv || 0).toFixed(2)}</span>
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
                        <div className="text-sm font-medium text-purple-700 mb-1">Active Assignments ({selectedDay || 'any day'}, {selectedShift ? getShiftLabel(selectedShift) : 'any shift'})</div>
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
                                          <div className="font-medium">WO: {a.workorder_no || a.work_order_id}{Number(a.assigned_quantity || 0) > 0 ? ` • Qty: ${a.assigned_quantity}` : ''}</div>
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
                                      {(notes.dept || '').toUpperCase()} • {notes.day || '-'} • {notes.shift ? getShiftLabel(notes.shift) : '-'}
                                    </div>
                                    {isTransfer && notes.from_machine && (
                                      <div className="text-pink-700 text-[10px] mt-0.5">
                                        From: {notes.from_machine}
                                      </div>
                                    )}
                                  </span>
                                  <span className={`font-medium ${isTransfer ? 'text-pink-700' : 'text-purple-700'}`}>
                                    {Number(a.assigned_korv || 0).toFixed(2)}
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

        {/* Controls: search + department moved below the map and above the table */}
        <div className="w-full px-4 mt-4" style={{ paddingRight: sidebarMachine ? 380 : 0 }}>
          <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search open WOs.."
                className="flex-1 min-w-[240px] max-w-[600px] font-sans text-black border-black border rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 transition-colors"
              />
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="font-sans text-black border-black border rounded-2xl px-3 py-2 text-sm w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-700 transition-colors"
              >
                <option value="cnc">CNC</option>
                <option value="cyl">Cylindrical</option>
                <option value="tc">T&C</option>
                <option value="quality">Quality</option>
              </select>
              <button
                onClick={generateProductionPlanPDF}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl text-sm shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
              >
                � Download Production Plan PDF
              </button>
            </div>
            {assignMsg && (() => {
              const cleaned = String(assignMsg).replace(/,\s*\d+(?:\.\d+)?\s*min\)?/i, ')');
              return (
                <div className={`p-2 rounded ${assignMsg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {cleaned}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Assignment Modal - Fixed overlay */}
        {confirmAssign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmAssign(null)}>
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-500 p-8 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Assign Work Order</h3>
                  <p className="text-base text-gray-600 mt-1">Machine: <span className="font-semibold text-blue-600">{sidebarMachine?.label || '—'}</span></p>
                </div>
                <button 
                  onClick={() => setConfirmAssign(null)} 
                  className="text-gray-400 hover:text-gray-700 text-3xl leading-none transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Work Order:</span>
                  <span className="text-lg font-bold text-blue-900">{confirmAssign.wo.workorder_no || confirmAssign.wo.work_order_no || confirmAssign.wo.id}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Available Quantity:</span>
                  <span className="text-lg font-bold text-green-700">{confirmAssign.remainingQty} units</span>
                </div>
                <div className="text-sm text-gray-600 mt-3 pt-3 border-t border-blue-200">
                  <span className="font-medium">{confirmAssign.wo.tool_code}</span> • {confirmAssign.wo.tool_description}
                </div>
              </div>
              
              {confirmAssign.needsQuickTime && (
                <div className="mb-6 p-5 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-400 rounded-xl shadow-sm">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-3xl">⏱️</span>
                    <div>
                      <h4 className="font-bold text-amber-900 text-base">Time Data Required</h4>
                      <p className="text-sm text-amber-800 mt-1">Enter operation time in minutes per unit. This will be saved to Tool Master.</p>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={confirmAssign.quickTime || ''}
                      onChange={(e) => setConfirmAssign(c => ({ ...c, quickTime: e.target.value }))}
                      placeholder="e.g., 15.5"
                      className="w-full px-5 py-4 text-xl font-bold border-2 border-amber-400 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-300 focus:border-amber-500 transition-all shadow-sm"
                      autoFocus
                    />
                    <span className="absolute right-5 top-1/2 transform -translate-y-1/2 text-amber-700 text-base font-bold">min/unit</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-bold text-gray-800 mb-3">Quantity to Assign</label>
                  <input
                    type="number"
                    min="1"
                    max={confirmAssign.remainingQty}
                    value={confirmAssign.amount}
                    onChange={(e) => setConfirmAssign(c => ({ ...c, amount: e.target.value }))}
                    placeholder="Enter quantity"
                    className="w-full px-5 py-4 text-xl font-bold border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all shadow-sm"
                    autoFocus={!confirmAssign.needsQuickTime}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    disabled={assigning || !confirmAssign.amount || Number(confirmAssign.amount) <= 0 || (confirmAssign.needsQuickTime && (!confirmAssign.quickTime || Number(confirmAssign.quickTime) <= 0))}
                    onClick={() => handleAssign(confirmAssign.wo, confirmAssign.amount, (confirmAssign.dept || dept), confirmAssign.quickTime)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg text-lg"
                  >
                    {assigning ? '⏳ Assigning...' : `✓ Assign ${confirmAssign.amount || '?'} Units`}
                  </button>
                  <button 
                    onClick={() => setConfirmAssign(null)} 
                    className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Open Work Orders table below the controls */}
        <div className="w-full px-4 mt-4 mb-8" style={{ paddingRight: sidebarMachine ? 380 : 0 }}>
          <div className="w-full max-w-[1200px] mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-800">Open Work Orders</h3>
              <div className="flex items-center gap-3">
                {tempToolTimes.size > 0 && (
                  <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                    ⏱️ {tempToolTimes.size} temporary tool time{tempToolTimes.size > 1 ? 's' : ''} (will save on End Planning)
                  </div>
                )}
                <div className="text-xs text-gray-500">Dept: {(dept || '').toUpperCase()}</div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {openWOs.length === 0 ? (
                <div className="p-4 text-gray-400 text-sm text-center">No open work orders.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">WO No</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Tool Code</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Quantity</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Final KORV</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {openWOs.map(wo => {
                      const isCoatingRequired = wo.coating_required === 'yes';
                      const chosenDept = dept;
                      const assignedQty = Number(wo?._assignedQty?.[chosenDept] || 0);
                      const remainingQty = Math.max(0, Number(wo.quantity || 0) - assignedQty);
                      return (
                        <tr
                          key={wo.id}
                          className="hover:bg-blue-50 transition-colors cursor-move"
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, wo)}
                        >
                          <td className="px-3 py-2 font-medium text-gray-900">
                            🎯 {wo.workorder_no || wo.work_order_no || wo.id}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{wo.tool_code}</td>
                          <td className="px-3 py-2 text-gray-600">
                            <div className="max-w-xs truncate">{wo.tool_description}</div>
                            {isCoatingRequired && (
                              <div className="text-xs text-amber-600 mt-0.5">🎨 {wo.coating_type || 'Coating required'}</div>
                            )}
                            {wo.marking && (
                              <div className="text-xs text-blue-600 mt-0.5">✏️ {wo.marking}</div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-gray-900 font-medium">{wo.quantity || 0}</div>
                            {assignedQty > 0 && (
                              <div className="text-xs text-green-600 font-semibold">
                                {assignedQty} planned, {remainingQty} left
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-gray-900 font-bold text-lg">
                              {(wo._korv?.finalKorv || 0).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                              Planning
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex gap-1 justify-end">
                              <button 
                                disabled={assigning} 
                                onClick={() => openAssignPrompt(wo)} 
                                className="btn-primary text-xs px-3 py-1"
                              >
                                Assign {dept.toUpperCase()}
                              </button>
                              <button 
                                onClick={() => handleEndFactoryPlanning(wo.id, wo.workorder_no || wo.work_order_no || wo.id)} 
                                className="btn-secondary text-xs px-3 py-1" 
                                title="End factory planning for this WO"
                              >
                                End Planning
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
