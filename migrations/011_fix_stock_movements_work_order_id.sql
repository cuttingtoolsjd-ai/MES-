-- 011_fix_stock_movements_work_order_id.sql
-- Fix stock_movements records where work_order_id is set to the work order number (not UUID)
-- This migration updates work_order_id to the correct UUID for all such records



-- Direct update for all non-UUID work_order_id values that match a work_order_no
UPDATE stock_movements sm
SET work_order_id = wo.id
FROM work_orders wo
WHERE sm.action = 'ISSUE'
  AND sm.work_order_id IS NOT NULL
  AND length(sm.work_order_id::text) < 36 -- crude check for non-UUID
  AND sm.work_order_id::text = wo.work_order_no
  AND sm.work_order_id::text <> wo.id::text;

-- Optionally, verify fix:
-- SELECT id, work_order_id FROM stock_movements WHERE action = 'ISSUE' AND length(work_order_id::text) < 36;
