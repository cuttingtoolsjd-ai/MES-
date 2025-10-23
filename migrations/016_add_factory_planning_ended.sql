-- Add columns to track when factory planning ends for a work order
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS factory_planning_ended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS factory_planning_ended_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN work_orders.factory_planning_ended IS 'Indicates if factory planning has been completed for this work order';
COMMENT ON COLUMN work_orders.factory_planning_ended_at IS 'Timestamp when factory planning was ended';
