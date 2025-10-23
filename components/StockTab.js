import { useState } from 'react';
import FGTab from './stock/FGTab';
import RawTab from './stock/RawTab';
import ConsTab from './stock/ConsTab';
import StockOverview from './stock/StockOverview';

const STOCK_TABS = [
  { label: 'Overview', value: 'OVERVIEW' },
  { label: 'Finished/Rejected (FG/RG)', value: 'FG_RG' },
  { label: 'Raw Material', value: 'RAW' },
  { label: 'Consumables', value: 'CONS' },
];

export default function StockTab({ user }) {
  const [tab, setTab] = useState('OVERVIEW');

  return (
    <div>
      <div className="flex space-x-2 mb-4">
        {STOCK_TABS.map((t) => (
          <button
            key={t.value}
            className={`px-4 py-2 rounded-md font-medium border transition-colors ${tab === t.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>
        {tab === 'OVERVIEW' && <StockOverview user={user} />}
        {tab === 'FG_RG' && <FGTab user={user} />}
        {tab === 'RAW' && <RawTab user={user} />}
        {tab === 'CONS' && <ConsTab user={user} />}
      </div>
    </div>
  );
}
