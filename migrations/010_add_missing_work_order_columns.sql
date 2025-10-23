-- Add missing columns to work_orders table
-- These columns exist in the migration but may not have been added to the database

-- First, handle the workorder_no vs work_order_no discrepancy
-- If workorder_no exists but work_order_no doesn't, rename it
DO $$
BEGIN
  -- Check if workorder_no exists and work_order_no doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'workorder_no'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'work_order_no'
  ) THEN
    -- Rename workorder_no to work_order_no
    ALTER TABLE work_orders RENAME COLUMN workorder_no TO work_order_no;
  END IF;
  
  -- If neither exists, create work_order_no
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'work_order_no'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'workorder_no'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN work_order_no text;
  END IF;
END$$;

-- Add price_per_unit if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'price_per_unit'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN price_per_unit numeric;
  END IF;
END$$;

-- Add total_price if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'total_price'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN total_price numeric;
  END IF;
END$$;

-- Add korv_per_unit if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'korv_per_unit'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN korv_per_unit numeric;
  END IF;
END$$;

-- Add total_korv if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'total_korv'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN total_korv numeric;
  END IF;
END$$;

-- Add drawing_no if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'drawing_no'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN drawing_no text;
  END IF;
END$$;

-- Add customer_name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN customer_name text;
  END IF;
END$$;

-- Add po_number if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'po_number'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN po_number text;
  END IF;
END$$;

-- Add standard_korv if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'standard_korv'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN standard_korv numeric;
  END IF;
END$$;

-- Add cnc_time if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'cnc_time'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN cnc_time numeric;
  END IF;
END$$;

-- Add cylindrical_time if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'cylindrical_time'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN cylindrical_time numeric;
  END IF;
END$$;

-- Add tc_estimated if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'tc_estimated'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN tc_estimated numeric;
  END IF;
END$$;

-- Add organisational_korv if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'organisational_korv'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN organisational_korv numeric;
  END IF;
END$$;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'work_orders'
ORDER BY ordinal_position;
