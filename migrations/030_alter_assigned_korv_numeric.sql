-- v030: Allow fractional korv values and keep the dependent view in sync
-- Strategy: drop the view (if exists), alter column type, recreate the view with correct columns/aliases.

BEGIN;

-- 1) Drop the dependent view to avoid type-change conflicts
DROP VIEW IF EXISTS machine_assignments_view;

-- 2) Alter the column to NUMERIC so decimals like 4.8 are allowed
ALTER TABLE machine_assignments
  ALTER COLUMN assigned_korv TYPE numeric USING assigned_korv::numeric;

-- Keep NOT NULL
ALTER TABLE machine_assignments
  ALTER COLUMN assigned_korv SET NOT NULL;

COMMENT ON COLUMN machine_assignments.assigned_korv IS 'Assigned KORV (can be fractional; 1 KORV = 5 minutes)';

-- 3) Recreate the view with the fields the app expects
--    Note: work_orders has work_order_no (with underscores). We also expose an alias workorder_no for UI backward-compat.
CREATE VIEW machine_assignments_view AS
SELECT
  ma.id,
  ma.work_order_id,
  ma.machine,
  ma.assigned_korv,
  ma.assigned_quantity,
  ma.status,
  ma.notes,
  ma.assigned_at,
  ma.released_at,
  ma.rolled_over_from,
  wo.work_order_no AS workorder_no,
  wo.work_order_no,
  wo.tool_code,
  wo.tool_description
FROM machine_assignments ma
LEFT JOIN work_orders wo
  ON wo.id = ma.work_order_id;

COMMIT;
