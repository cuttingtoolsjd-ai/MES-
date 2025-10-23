// FGTab.js - Finished/Rejected Goods Tab
import StockForm from './StockForm';
import StockTable from './StockTable';

export default function FGTab({ user }) {
  return (
    <div className="space-y-6">
      <StockForm groupCode="FG_RG" user={user} />
      <StockTable groupCode="FG_RG" user={user} />
    </div>
  );
}
