-- Add production_status column to work_orders table
-- This tracks the actual shop floor status (Not Started, In Progress, Finished, Rejected)
-- separate from the planning status

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS production_status text DEFAULT 'Not Started';

-- Add a check constraint for valid production statuses (drop first if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'production_status_check'
  ) THEN
    ALTER TABLE work_orders DROP CONSTRAINT production_status_check;
  END IF;
END$$;

ALTER TABLE work_orders
ADD CONSTRAINT production_status_check 
CHECK (production_status IN ('Not Started', 'In Progress', 'Finished', 'Rejected', 'On Hold'));

-- Create an index for faster filtering by production status
CREATE INDEX IF NOT EXISTS work_orders_production_status_idx 
ON work_orders(production_status);

-- Optional: Add columns to track who marked it finished/rejected and when
ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS production_completed_by text,
ADD COLUMN IF NOT EXISTS production_completed_at timestamptz;
