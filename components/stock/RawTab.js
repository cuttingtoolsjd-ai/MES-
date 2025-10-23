// RawTab.js - Raw Material Tab
import StockForm from './StockForm';
import StockTable from './StockTable';

export default function RawTab({ user }) {
  return (
    <div className="space-y-6">
      <StockForm groupCode="RAW" user={user} />
      <StockTable groupCode="RAW" user={user} />
    </div>
  );
}
