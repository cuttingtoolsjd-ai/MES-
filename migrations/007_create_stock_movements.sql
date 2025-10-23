-- Stock movements table to track adds/issues/adjustments, with optional linkage to work orders

-- Drop and recreate to ensure clean schema
DROP TABLE IF EXISTS stock_movements CASCADE;

CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('ADD','ISSUE','ADJUST','MOVE_TO_SCRAP','RENAME_TO_STOCK')),
  qty numeric NOT NULL DEFAULT 0,
  reason text,
  target_type text, -- 'WORK_ORDER' | 'OTHER' | null
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  performed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_item_idx ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS stock_movements_work_order_idx ON stock_movements(work_order_id);
