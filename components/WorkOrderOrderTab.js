import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import ProductionPlanPDF from './ProductionPlanPDF';

const DEFAULT_MACHINES = [
  'CNC1', 'CNC2', 'CNC3', 'CNC4', 'CNC5', 'CNC7',
  'CYLN1', 'CYLN2', 'CPX', 'TOPWORK',
  'OPG1', 'T&C1', 'T&C2',
  'COATING', 'EDM'
];

const SHIFT_NAMES = {
  '1': 'Shift 1 (7AM-3PM)',
  '2': 'Shift 2 (3PM-11PM)',
  '3': 'Shift 3 (11PM-7AM)',
  'first': 'First',
  'second': 'Second',
  'night': 'Night'
};

export default function WorkOrderOrderTab() {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterShift, setFilterShift] = useState('');

  useEffect(() => {
    supabase.from('machine_settings').select('machine_id').then(({ data }) => {
      if (data?.length) {
        const ids = data.map(m => m.machine_id);
        setMachines(ids);
        setSelectedMachine(ids[0]);
      } else {
        setMachines(DEFAULT_MACHINES);
        setSelectedMachine(DEFAULT_MACHINES[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedMachine) return;
    const fields = 'id, work_order_id, order, assigned_korv, is_active, started_at, notes, work_orders(work_order_no, tool_code, quantity)';
    supabase
      .from('machine_assignments')
      .select(fields)
      .eq('machine', selectedMachine)
      .is('released_at', null)
      .then(({ data, error }) => {
        if (error) {
          setAssignments([]);
          return;
        }
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
    if (idx + dir < 0 || idx + dir >= filtered.length) return;
    const a = filtered[idx],
      b = filtered[idx + dir];
    if (a.is_active || b.is_active) {
      alert('⚠️ Cannot move active work orders');
      return;
    }
    const i1 = assignments.findIndex(x => x.id === a.id);
    const i2 = assignments.findIndex(x => x.id === b.id);
    if (i1 === -1 || i2 === -1) return;
    const arr = [...assignments];
    [arr[i1], arr[i2]] = [arr[i2], arr[i1]];
    setAssignments(arr);
  }

  async function saveOrder() {
    setSaving(true);
    for (let i = 0; i < assignments.length; i++) {
      await supabase.from('machine_assignments').update({ order: i }).eq('id', assignments[i].id);
    }
    setSaving(false);
    alert('✅ Production sequence saved!');
  }

  const filtered = assignments.filter(a => {
    if (!filterDate && !filterShift) return true;
    let n = {};
    try {
      n = typeof a.notes === 'string' ? JSON.parse(a.notes) : a.notes || {};
    } catch (e) {
      return false;
    }
    return (!filterDate || n.day === filterDate) && (!filterShift || String(n.shift) === String(filterShift));
  });

  const grouped = {};
  filtered.forEach(a => {
    let n = {};
    try {
      n = typeof a.notes === 'string' ? JSON.parse(a.notes) : a.notes || {};
    } catch (e) {
      return;
    }
    const m = a.machine || 'Unknown',
      s = n.shift || 'N/A',
      d = n.day || 'N/A';
    const k = m + '|' + d + '|' + s;
    if (!grouped[k]) grouped[k] = { machine: m, day: d, shift: s, workOrders: [] };
    grouped[k].workOrders.push(a);
  });

  const groups = Object.values(grouped).sort(
    (a, b) =>
      a.machine !== b.machine
        ? a.machine.localeCompare(b.machine)
        : a.day !== b.day
        ? a.day.localeCompare(b.day)
        : String(a.shift).localeCompare(String(b.shift))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 shadow-lg">
        <h2 className="text-3xl font-bold mb-2">📋 Production Sequencing</h2>
        <p className="text-blue-100">Manage work order sequence by Machine and Shift</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-4">
        <div className="flex gap-3">
          <span className="text-2xl">ℹ️</span>
          <div className="text-sm text-blue-800">
            <strong>Active orders are locked</strong> and cannot be reordered. Complete the current work or pause it to reorder.
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Machine Selection */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">🏭 Select Machine</label>
          <select
            value={selectedMachine}
            onChange={e => setSelectedMachine(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {machines.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Filter by Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Shift Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">🕐 Filter by Shift</label>
          <select
            value={filterShift}
            onChange={e => setFilterShift(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Shifts</option>
            <option value="1">Shift 1 (7AM-3PM)</option>
            <option value="2">Shift 2 (3PM-11PM)</option>
            <option value="3">Shift 3 (11PM-7AM)</option>
            <option value="first">First</option>
            <option value="second">Second</option>
            <option value="night">Night</option>
          </select>
        </div>
      </div>

      {/* Filter Summary */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            <strong>Showing:</strong> {filtered.length} of {assignments.length} work order(s)
          </div>
          <button
            onClick={() => {
              setFilterDate('');
              setFilterShift('');
            }}
            className="px-3 py-1 text-sm bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg"
          >
            🔄 Clear Filters
          </button>
        </div>
      </div>

      {/* Main Content */}
      {filtered.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-2xl text-gray-400 mb-2">📭</p>
          <p className="text-gray-600 font-medium">No work orders match your filter</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting the filters above</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Production Groups */}
          {groups.map(g => {
            const total = g.workOrders.reduce((s, a) => s + (a.assigned_korv || 0), 0);
            const active = g.workOrders.filter(a => a.is_active).length;

            return (
              <div key={g.machine + g.day + g.shift} className="border-2 border-blue-300 rounded-lg shadow-lg overflow-hidden">
                {/* Machine-Shift Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 flex justify-between items-center">
                  <div className="flex items-center gap-5">
                    <div className="text-4xl font-bold">{g.machine}</div>
                    <div className="border-l-2 border-blue-300 pl-5">
                      <div className="text-sm font-light text-blue-100">{g.day}</div>
                      <div className="text-xl font-bold">{SHIFT_NAMES[g.shift] || g.shift}</div>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="bg-blue-500 rounded-lg px-5 py-3 text-center shadow-md">
                    <div className="text-xs font-semibold text-blue-100 mb-1">📊 SUMMARY</div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-2xl font-bold">{g.workOrders.length}</div>
                        <div className="text-xs text-blue-100">Orders</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{total}</div>
                        <div className="text-xs text-blue-100">Korv</div>
                      </div>
                      {active > 0 && (
                        <div>
                          <div className="text-2xl font-bold text-yellow-300">{active}</div>
                          <div className="text-xs text-blue-100">Active</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Work Orders List */}
                <div className="bg-gray-50 p-5">
                  <ul className="space-y-3">
                    {g.workOrders.map((a, idx) => {
                      const w = a.work_orders;
                      const wn = w?.work_order_no || a.work_order_id;
                      const act = a.is_active;

                      return (
                        <li
                          key={a.id}
                          className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                            act ? 'bg-red-50 border-red-400 shadow-md' : 'bg-white border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          {/* Sequence Number */}
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-md">
                            {idx + 1}
                          </div>

                          {/* Work Order Details */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-bold text-lg text-gray-900">WO: {wn}</span>
                              {act && (
                                <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
                                  🔴 ACTIVE
                                </span>
                              )}
                            </div>
                            {w && (
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex gap-4">
                                  <span>
                                    🔧 <strong>Tool:</strong> {w.tool_code}
                                  </span>
                                  <span>
                                    📦 <strong>Qty:</strong> {w.quantity}
                                  </span>
                                  <span>
                                    ⏱️ <strong>Korv:</strong> {a.assigned_korv}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Move Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => move(idx, -1)}
                              disabled={idx === 0 || act}
                              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors"
                              title="Move up in sequence"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => move(idx, 1)}
                              disabled={idx === g.workOrders.length - 1 || act}
                              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors"
                              title="Move down in sequence"
                            >
                              ↓
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap bg-white rounded-lg shadow p-5">
        <button
          onClick={saveOrder}
          disabled={saving || !assignments.length}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md"
        >
          ✅ Save Sequence
        </button>

        <ProductionPlanPDF groups={groups} filterDate={filterDate} selectedMachine={selectedMachine} />

        <button
          onClick={() => {
            setFilterDate('');
            setFilterShift('');
          }}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-md"
        >
          🔄 Reset Filters
        </button>
      </div>
    </div>
  );
}
