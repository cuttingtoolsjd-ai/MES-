-- Add column to track which work order is currently being worked on
-- This allows managers to see what's actively on each machine

-- Add is_active column to track current work order on machine
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'machine_assignments' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE machine_assignments 
        ADD COLUMN is_active boolean DEFAULT false;
    END IF;
END $$;

-- Add started_at timestamp to track when work started
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'machine_assignments' AND column_name = 'started_at'
    ) THEN
        ALTER TABLE machine_assignments 
        ADD COLUMN started_at timestamp with time zone;
    END IF;
END $$;

-- Create index for filtering active work orders
CREATE INDEX IF NOT EXISTS idx_machine_assignments_is_active 
ON machine_assignments(is_active);

-- Create unique constraint to ensure only one active work order per machine
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_per_machine 
ON machine_assignments(machine) 
WHERE is_active = true AND released_at IS NULL;

COMMENT ON COLUMN machine_assignments.is_active IS 'True if this work order is currently being worked on';
COMMENT ON COLUMN machine_assignments.started_at IS 'Timestamp when operator started working on this order';
