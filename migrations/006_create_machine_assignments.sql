-- Table: machine_assignments
-- Tracks which work order and korv is assigned to which machine, with day/shift planning

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop old table if it exists (be careful - this will delete data!)
-- DROP TABLE IF EXISTS machine_assignments CASCADE;

CREATE TABLE IF NOT EXISTS machine_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  machine text NOT NULL,              -- e.g., 'CNC2', 'CYLN1'
  assigned_korv integer NOT NULL CHECK (assigned_korv >= 0),
  status text NOT NULL DEFAULT 'assigned',
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,  -- stores {day, shift, dept}
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);

-- If you previously had a foreign key on machine to some UUID table, drop it safely:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'machine_assignments_machine_fkey'
  ) THEN
    ALTER TABLE machine_assignments DROP CONSTRAINT machine_assignments_machine_fkey;
  END IF;
END$$;

-- Useful indexes
-- Fast lookup for active assignments per machine
CREATE INDEX IF NOT EXISTS machine_assignments_active_machine_idx
ON machine_assignments (machine)
WHERE released_at IS NULL;

-- Fast lookup by work order
CREATE INDEX IF NOT EXISTS machine_assignments_work_order_id_idx
ON machine_assignments (work_order_id);

-- Optional: sort by newest assignments
CREATE INDEX IF NOT EXISTS machine_assignments_assigned_at_idx
ON machine_assignments (assigned_at DESC);

-- Create the view for easy querying with work order details
CREATE OR REPLACE VIEW machine_assignments_view AS
SELECT
  ma.*,
  wo.workorder_no,
  wo.tool_code,
  wo.tool_description
FROM machine_assignments ma
LEFT JOIN work_orders wo
  ON wo.id = ma.work_order_id;

