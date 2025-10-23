import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

function getUniqueMachines(assignments) {
  return Array.from(new Set(assignments.map(a => a.machine)));
}

function getEfficiency(assignments, startTime, endTime) {
  const machines = getUniqueMachines(assignments);
  const totalPeriod = (endTime - startTime) / 1000; // seconds
  return machines.map(machine => {
    // Sum busy time for this machine
    const busy = assignments
      .filter(a => a.machine === machine)
      .reduce((sum, a) => {
        const from = Math.max(new Date(a.assigned_at).getTime(), startTime);
        const to = a.released_at ? Math.min(new Date(a.released_at).getTime(), endTime) : endTime;
        return sum + Math.max(0, (to - from) / 1000);
      }, 0);
    return {
      machine,
      efficiency: Math.round((busy / totalPeriod) * 100)
    };
  });
}

export default function MachineEfficiencyGraph() {
  const [assignments, setAssignments] = useState([]);
  const [efficiencyData, setEfficiencyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    start.setHours(0,0,0,0);
    return { start, end };
  });

  useEffect(() => {
    async function fetchAssignments() {
      setLoading(true);
      const { data, error } = await supabase
        .from('machine_assignments')
        .select('machine, assigned_at, released_at')
        .gte('assigned_at', timeRange.start.toISOString())
        .lte('assigned_at', timeRange.end.toISOString());
      if (!error) {
        const arr = Array.isArray(data) ? data : [];
        setAssignments(arr);
        setEfficiencyData(getEfficiency(arr, timeRange.start.getTime(), timeRange.end.getTime()));
      }
      setLoading(false);
    }
    fetchAssignments();
  }, [timeRange]);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-bold mb-4 text-green-900">Machine Efficiency (Last 7 Days)</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={efficiencyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="machine" />
            <YAxis domain={[0, 100]} tickFormatter={v => v + '%'} />
            <Tooltip formatter={v => v + '%'} />
            <Legend />
            <Bar dataKey="efficiency" fill="#34d399" name="Efficiency (%)" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
