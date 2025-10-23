import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MachineSettingsTable() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMachines();
  }, []);

  async function fetchMachines() {
    setLoading(true);
    const { data, error } = await supabase
      .from('machine_settings')
      .select('*')
      .order('machine_id');
    if (error) setError(error.message);
    else setMachines(data || []);
    setLoading(false);
  }

  async function handleToggleMaintenance(machine_id, current) {
    setSaving(true);
    setError('');
    const { error } = await supabase
      .from('machine_settings')
      .update({ maintenance: !current, updated_at: new Date().toISOString() })
      .eq('machine_id', machine_id);
    if (error) setError(error.message);
    else fetchMachines();
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-bold mb-4 text-indigo-900">Machine Settings</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Machine</th>
              <th className="px-4 py-2 text-center">Max Korv</th>
              <th className="px-4 py-2 text-center">Under Maintenance</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {machines.map(m => (
              <tr key={m.machine_id} className={m.maintenance ? 'bg-yellow-100' : ''}>
                <td className="px-4 py-2 font-semibold">{m.machine_id}</td>
                <td className="px-4 py-2 text-center">{m.max_korv}</td>
                <td className="px-4 py-2 text-center">
                  {m.maintenance ? <span className="text-yellow-700 font-bold">Yes</span> : 'No'}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => handleToggleMaintenance(m.machine_id, m.maintenance)}
                    disabled={saving}
                    className={`px-3 py-1 rounded ${m.maintenance ? 'bg-green-600' : 'bg-yellow-600'} text-white font-medium hover:opacity-80`}
                  >
                    {m.maintenance ? 'Mark as Available' : 'Mark Under Maintenance'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
