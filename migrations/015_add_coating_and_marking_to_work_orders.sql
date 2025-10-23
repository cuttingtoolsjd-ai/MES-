-- Add coating and marking fields to work_orders
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS coating_required boolean;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS coating_type text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS marking text;
