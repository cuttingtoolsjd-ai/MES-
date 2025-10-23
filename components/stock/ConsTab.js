// ConsTab.js - Consumables Tab
import StockForm from './StockForm';
import StockTable from './StockTable';
import ConsumableUsageForm from './ConsumableUsageForm';

export default function ConsTab({ user }) {
  return (
    <div className="space-y-6">
      <StockForm groupCode="CONS" user={user} />
      <ConsumableUsageForm user={user} />
      <StockTable groupCode="CONS" user={user} />
    </div>
  );
}
