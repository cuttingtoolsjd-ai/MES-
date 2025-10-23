-- 014_add_movement_reversal_columns.sql
-- Add reversal metadata columns to stock_movements

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_by text,
  ADD COLUMN IF NOT EXISTS reversal_of uuid REFERENCES stock_movements(id);

-- Helpful index for queries that look for non-reversed issues
CREATE INDEX IF NOT EXISTS stock_movements_reversed_at_idx ON stock_movements(reversed_at);
