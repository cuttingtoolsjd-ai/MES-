-- Fix: cannot alter column type because view depends on it
-- Strategy: drop the dependent view, alter the column type, recreate the view.

-- v031: Ensure the view exists with correct columns (idempotent)

BEGIN;

CREATE OR REPLACE VIEW machine_assignments_view AS
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
