-- Create regrinding table for RE prefix work orders
-- Simpler than tool_master - only stores CNC time and basic info

CREATE TABLE IF NOT EXISTS regrinding (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_code text NOT NULL,
  tool_description text,
  cnc_time numeric DEFAULT 0,
  standard_korv numeric DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  created_by text,
  updated_at timestamptz DEFAULT NOW(),
  updated_by text
);

-- Create index for quick lookup by tool_code
CREATE INDEX IF NOT EXISTS idx_regrinding_tool_code ON regrinding(tool_code);

-- Add unique constraint to prevent duplicate tool codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_regrinding_tool_code_unique ON regrinding(tool_code);

COMMENT ON TABLE regrinding IS 'Simplified tool master for regrinding (RE prefix) work orders - only CNC time tracked';
COMMENT ON COLUMN regrinding.cnc_time IS 'CNC machining time in minutes';
COMMENT ON COLUMN regrinding.standard_korv IS 'Standard KORV value for this regrinding tool';
