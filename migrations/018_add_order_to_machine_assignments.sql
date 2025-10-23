-- Migration: Add 'order' column to machine_assignments for explicit work order sequencing per machine
ALTER TABLE machine_assignments ADD COLUMN "order" integer;
-- Optional: Set default order for existing assignments (by assigned_at)
UPDATE machine_assignments SET "order" = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY machine ORDER BY assigned_at) as rn
  FROM machine_assignments
) sub WHERE machine_assignments.id = sub.id;
