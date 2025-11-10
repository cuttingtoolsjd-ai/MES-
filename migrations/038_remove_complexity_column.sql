-- Remove complexity column from work_orders table
ALTER TABLE work_orders DROP COLUMN IF EXISTS complexity;