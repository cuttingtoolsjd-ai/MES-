import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';

// Helper to calculate operator efficiency based on work assignments and completions
async function getOperatorEfficiency() {
  // Get all operators (users with role operator)
  const { data: operators, error: opError } = await supabase
    .from('users')
    .select('id, username')
    .eq('role', 'operator')
    .eq('active', true);

  if (opError || !operators) return [];

  const efficiencyData = [];

  for (const operator of operators) {
    // Get all assignments for this operator
    const { data: assignments } = await supabase
      .from('machine_assignments')
      .select('*, work_orders!inner(status)')
      .eq('assigned_to', operator.username);

    if (!assignments || assignments.length === 0) {
      efficiencyData.push({
        operator: operator.username,
        completionRate: 0,
        totalAssignments: 0,
        completed: 0
      });
      continue;
    }

    // Count completed vs total
    const completed = assignments.filter(a => {
      // Check if the work order is completed or dispatched
      return a.work_orders && ['Completed', 'Dispatched', 'Quality Done', 'Coating Done', 'Ready for Dispatch'].includes(a.work_orders.status);
    }).length;

    const completionRate = Math.round((completed / assignments.length) * 100);

    efficiencyData.push({
      operator: operator.username,
      completionRate,
      totalAssignments: assignments.length,
      completed
    });
  }

  return efficiencyData.sort((a, b) => b.completionRate - a.completionRate);
}

export default function OperatorEfficiencyGraph() {
  const [efficiencyData, setEfficiencyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const data = await getOperatorEfficiency();
      setEfficiencyData(data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Color based on completion rate
  const getColor = (rate) => {
    if (rate >= 80) return '#10b981'; // green
    if (rate >= 60) return '#fbbf24'; // yellow
    if (rate >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-bold mb-4 text-purple-900">Operator Efficiency (Workload Completion)</h2>
      <p className="text-sm text-gray-600 mb-4">Shows how often operators complete their assigned work</p>
      {loading ? (
        <div>Loading...</div>
      ) : efficiencyData.length === 0 ? (
        <div className="text-gray-500 text-center py-8">No operator data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={efficiencyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="operator" />
            <YAxis domain={[0, 100]} tickFormatter={v => v + '%'} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'completionRate') return [value + '%', 'Completion Rate'];
                return [value, name];
              }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded shadow">
                      <p className="font-semibold">{data.operator}</p>
                      <p className="text-sm">Completion Rate: {data.completionRate}%</p>
                      <p className="text-sm">Completed: {data.completed} / {data.totalAssignments}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Bar dataKey="completionRate" name="Completion Rate (%)">
              {efficiencyData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.completionRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
