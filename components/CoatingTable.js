// CoatingTable.js
// Table to track items sent to and returned from coating
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function CoatingTable({ user }) {
  const [coatingIn, setCoatingIn] = useState([]);
  const [coatingOut, setCoatingOut] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCoating() {
      setLoading(true);
      // Fetch work orders sent to coating
      const { data: inData } = await supabase
        .from('work_orders')
        .select('*')
        .not('sent_to_coating_at', 'is', null)
        .is('coating_completed_at', null);
      // Fetch work orders returned from coating
      const { data: outData } = await supabase
        .from('work_orders')
        .select('*')
        .not('coating_completed_at', 'is', null);
      setCoatingIn(inData || []);
      setCoatingOut(outData || []);
      setLoading(false);
    }
    fetchCoating();
  }, []);

  if (loading) return <div>Loading coating data...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-lg mb-2">Sent to Coating</h2>
        <table className="min-w-full text-xs border border-gray-200 rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2">WO No</th>
              <th className="px-3 py-2">Tool</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Sent At</th>
            </tr>
          </thead>
          <tbody>
            {coatingIn.map(wo => (
              <tr key={wo.id}>
                <td className="px-3 py-2">{wo.work_order_no}</td>
                <td className="px-3 py-2">{wo.tool_code}</td>
                <td className="px-3 py-2">{wo.quantity}</td>
                <td className="px-3 py-2">{wo.sent_to_coating_at?.slice(0,16).replace('T',' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h2 className="font-bold text-lg mb-2">Returned from Coating</h2>
        <table className="min-w-full text-xs border border-gray-200 rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2">WO No</th>
              <th className="px-3 py-2">Tool</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Coating Done At</th>
            </tr>
          </thead>
          <tbody>
            {coatingOut.map(wo => (
              <tr key={wo.id}>
                <td className="px-3 py-2">{wo.work_order_no}</td>
                <td className="px-3 py-2">{wo.tool_code}</td>
                <td className="px-3 py-2">{wo.quantity}</td>
                <td className="px-3 py-2">{wo.coating_completed_at?.slice(0,16).replace('T',' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
