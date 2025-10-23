-- Add comprehensive status tracking fields to work_orders table

-- Add status tracking columns
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS factory_planning_at timestamptz;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS production_completed_at timestamptz;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS marking_completed_at timestamptz;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS sent_to_coating_at timestamptz;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS coating_completed_at timestamptz;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS ready_for_dispatch_at timestamptz;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;

-- Add fields for tracking who performed each step
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS factory_planning_by text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS production_completed_by text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS marking_completed_by text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS sent_to_coating_by text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS coating_completed_by text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS ready_for_dispatch_by text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS dispatched_by text;

-- Add notes fields for each step
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS marking_notes text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS coating_notes text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS dispatch_notes text;

-- Create index for quick filtering by status
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);

-- Create indexes for timestamp fields for reporting
CREATE INDEX IF NOT EXISTS idx_work_orders_production_completed ON work_orders(production_completed_at);
CREATE INDEX IF NOT EXISTS idx_work_orders_dispatched ON work_orders(dispatched_at);

-- Update existing completed work orders to have production_completed_at if status is Completed
UPDATE work_orders 
SET production_completed_at = NOW()
WHERE status = 'Completed' AND production_completed_at IS NULL;
