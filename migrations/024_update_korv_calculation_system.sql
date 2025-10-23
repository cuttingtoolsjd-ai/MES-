-- Update tool_master and work_orders for new korv calculation system
-- 1 korv = 5 minutes
-- Times are stored in minutes, korv is calculated automatically
-- Formula: total_korv = ((cnc_time + cylindrical_time + tc_time) / 5) * quantity

-- First, ensure we have time columns in tool_master (they may already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tool_master' AND column_name = 'cnc_time'
    ) THEN
        ALTER TABLE tool_master 
        ADD COLUMN cnc_time numeric(10,2) DEFAULT 0;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tool_master' AND column_name = 'cylindrical_time'
    ) THEN
        ALTER TABLE tool_master 
        ADD COLUMN cylindrical_time numeric(10,2) DEFAULT 0;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tool_master' AND column_name = 'tc_time'
    ) THEN
        ALTER TABLE tool_master 
        ADD COLUMN tc_time numeric(10,2) DEFAULT 0;
    END IF;
END$$;

-- Update tool_master to ensure cnc_time, cylindrical_time, tc_time are NOT NULL with defaults
ALTER TABLE tool_master 
  ALTER COLUMN cnc_time SET DEFAULT 0,
  ALTER COLUMN cylindrical_time SET DEFAULT 0,
  ALTER COLUMN tc_time SET DEFAULT 0;

UPDATE tool_master SET cnc_time = 0 WHERE cnc_time IS NULL;
UPDATE tool_master SET cylindrical_time = 0 WHERE cylindrical_time IS NULL;
UPDATE tool_master SET tc_time = 0 WHERE tc_time IS NULL;

ALTER TABLE tool_master 
  ALTER COLUMN cnc_time SET NOT NULL,
  ALTER COLUMN cylindrical_time SET NOT NULL,
  ALTER COLUMN tc_time SET NOT NULL;

-- Add a computed column helper or update korv calculation
-- We'll keep standard_korv for legacy but calculate it from times
-- standard_korv (per unit) = (cnc_time + cylindrical_time + tc_time) / 5

COMMENT ON COLUMN tool_master.cnc_time IS 'CNC machining time in minutes';
COMMENT ON COLUMN tool_master.cylindrical_time IS 'Cylindrical grinding time in minutes';
COMMENT ON COLUMN tool_master.tc_time IS 'T&C (Tool & Cutter) time in minutes';
COMMENT ON COLUMN tool_master.standard_korv IS 'Calculated korv per unit (1 korv = 5 min). Formula: (cnc_time + cylindrical_time + tc_time) / 5';

-- Update work_orders to have korv_per_unit auto-calculated
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_orders' AND column_name = 'korv_per_unit'
    ) THEN
        ALTER TABLE work_orders 
        ADD COLUMN korv_per_unit numeric(10,2) DEFAULT 0;
    END IF;
END$$;

COMMENT ON COLUMN work_orders.korv_per_unit IS 'Korv per unit from tool master (auto-calculated from times)';
COMMENT ON COLUMN work_orders.total_korv IS 'Total korv for entire work order = korv_per_unit * quantity';

-- Create a function to calculate korv from times
CREATE OR REPLACE FUNCTION calculate_korv_from_times(
  p_cnc_time numeric,
  p_cylindrical_time numeric,
  p_tc_time numeric
) RETURNS numeric AS $$
BEGIN
  RETURN ROUND((COALESCE(p_cnc_time, 0) + COALESCE(p_cylindrical_time, 0) + COALESCE(p_tc_time, 0)) / 5.0, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_korv_from_times IS 'Calculates korv from time values. 1 korv = 5 minutes. Returns (cnc_time + cylindrical_time + tc_time) / 5';

-- Create a view for easy tool master lookup with calculated korv
CREATE OR REPLACE VIEW tool_master_with_korv AS
SELECT 
  *,
  calculate_korv_from_times(cnc_time, cylindrical_time, tc_time) as calculated_korv_per_unit
FROM tool_master;

COMMENT ON VIEW tool_master_with_korv IS 'Tool master with auto-calculated korv per unit based on times';
