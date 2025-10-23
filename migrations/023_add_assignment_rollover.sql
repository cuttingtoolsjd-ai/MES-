-- Add rollover tracking for incomplete work assignments
-- When a shift ends and work is not completed, it should roll over to the next shift

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'machine_assignments' AND column_name = 'is_completed'
    ) THEN
        ALTER TABLE machine_assignments 
        ADD COLUMN is_completed boolean DEFAULT false;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'machine_assignments' AND column_name = 'rolled_over_from'
    ) THEN
        ALTER TABLE machine_assignments 
        ADD COLUMN rolled_over_from uuid REFERENCES machine_assignments(id);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'machine_assignments' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE machine_assignments 
        ADD COLUMN completed_at timestamptz;
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_machine_assignments_is_completed 
ON machine_assignments(is_completed);

CREATE INDEX IF NOT EXISTS idx_machine_assignments_rolled_over 
ON machine_assignments(rolled_over_from) 
WHERE rolled_over_from IS NOT NULL;

COMMENT ON COLUMN machine_assignments.is_completed IS 'True if the assigned work has been completed';
COMMENT ON COLUMN machine_assignments.rolled_over_from IS 'Reference to the original assignment if this is a rollover';
COMMENT ON COLUMN machine_assignments.completed_at IS 'Timestamp when the work was marked as completed';
