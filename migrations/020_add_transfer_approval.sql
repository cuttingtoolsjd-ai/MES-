-- Add transfer approval status to machine_assignments
-- This allows operators to accept or reject incoming transfers

-- Add status column for transfer approval
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'machine_assignments' AND column_name = 'transfer_status'
    ) THEN
        ALTER TABLE machine_assignments 
        ADD COLUMN transfer_status text DEFAULT 'active' CHECK (transfer_status IN ('active', 'pending_approval', 'rejected'));
    END IF;
END $$;

-- Add column to track who needs to approve
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'machine_assignments' AND column_name = 'pending_operator'
    ) THEN
        ALTER TABLE machine_assignments 
        ADD COLUMN pending_operator text;
    END IF;
END $$;

-- Add index for filtering pending transfers
CREATE INDEX IF NOT EXISTS idx_machine_assignments_transfer_status 
ON machine_assignments(transfer_status);

COMMENT ON COLUMN machine_assignments.transfer_status IS 'Status of transfer: active (normal/approved), pending_approval (awaiting acceptance), rejected';
COMMENT ON COLUMN machine_assignments.pending_operator IS 'Username of operator who needs to approve this transfer';
