import MachineIdleGraph from '../components/MachineIdleGraph';
import MachineEfficiencyGraph from '../components/MachineEfficiencyGraph';
import OperatorEfficiencyGraph from '../components/OperatorEfficiencyGraph';
import Link from 'next/link';

export default function KPIDashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">KPI Dashboard</h1>
              <p className="text-gray-600">Performance metrics and analytics</p>
            </div>
            <Link href="/dashboard" className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <MachineIdleGraph />
          <MachineEfficiencyGraph />
          <div className="lg:col-span-2">
            <OperatorEfficiencyGraph />
          </div>
        </div>
      </div>
    </div>
  );
}
