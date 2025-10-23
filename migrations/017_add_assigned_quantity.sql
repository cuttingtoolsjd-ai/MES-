-- Add assigned_quantity column to machine_assignments for quantity-based planning
ALTER TABLE machine_assignments 
ADD COLUMN IF NOT EXISTS assigned_quantity INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN machine_assignments.assigned_quantity IS 'Quantity of units assigned (for quantity-based planning)';

-- Update existing rows to have 0 as default
UPDATE machine_assignments SET assigned_quantity = 0 WHERE assigned_quantity IS NULL;
