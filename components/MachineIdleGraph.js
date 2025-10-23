import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

// Helper to get all unique machine names
function getUniqueMachines(assignments) {
  return Array.from(new Set(assignments.map(a => a.machine)));
}

// Helper to get idle periods for each machine
function getIdlePeriods(assignments, startTime, endTime) {
  const machines = getUniqueMachines(assignments);
  const idleData = [];
  machines.forEach(machine => {
    // Get all assignments for this machine, sorted by assigned_at
    const machineAssignments = assignments
      .filter(a => a.machine === machine)
      .sort((a, b) => new Date(a.assigned_at) - new Date(b.assigned_at));
    let lastRelease = startTime;
    machineAssignments.forEach(a => {
      // If there's a gap between last release and this assignment, it's idle
      if (lastRelease && new Date(a.assigned_at) > new Date(lastRelease)) {
        idleData.push({
          machine,
          from: new Date(lastRelease),
          to: new Date(a.assigned_at),
        });
      }
      lastRelease = a.released_at || endTime;
    });
    // If last release is before endTime, add final idle period
    if (lastRelease && new Date(lastRelease) < new Date(endTime)) {
      idleData.push({
        machine,
        from: new Date(lastRelease),
        to: new Date(endTime),
      });
    }
  });
  return idleData;
}

export default function MachineIdleGraph() {
  const [assignments, setAssignments] = useState([]);
  const [idleData, setIdleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState({
    start: new Date(new Date().setHours(0,0,0,0)),
    end: new Date()
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
        setIdleData(getIdlePeriods(arr, timeRange.start, timeRange.end));
      }
      setLoading(false);
    }
    fetchAssignments();
  }, [timeRange]);

  // Prepare data for recharts: one line per machine, X=time, Y=idle(1)/busy(0)
  const chartData = [];
  if (idleData.length > 0) {
    // Build a time series with 15-min intervals
    const interval = 15 * 60 * 1000;
    for (let t = +timeRange.start; t <= +timeRange.end; t += interval) {
      const point = { time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      getUniqueMachines(assignments).forEach(machine => {
        // Is this machine idle at this time?
        const isIdle = idleData.some(idle => idle.machine === machine && t >= +idle.from && t < +idle.to);
        point[machine] = isIdle ? 1 : 0;
      });
      chartData.push(point);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-bold mb-4 text-blue-900">Machine Idle Times (Today)</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[0, 1]} tickFormatter={v => (v === 1 ? 'Idle' : '')} />
            <Tooltip />
            <Legend />
            {getUniqueMachines(assignments).map(machine => (
              <Line
                key={machine}
                type="stepAfter"
                dataKey={machine}
                stroke="#8884d8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
