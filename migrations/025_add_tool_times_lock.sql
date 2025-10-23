-- Ensure stock_items has tool_code column before adding FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_items' AND column_name = 'tool_code'
    ) THEN
        ALTER TABLE stock_items ADD COLUMN tool_code text;
    END IF;
END$$;
-- Ensure stock_items.tool_code references tool_master.tool_code
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_stock_items_tool_code' AND table_name = 'stock_items'
    ) THEN
        ALTER TABLE stock_items
        ADD CONSTRAINT fk_stock_items_tool_code
        FOREIGN KEY (tool_code)
        REFERENCES tool_master(tool_code)
        ON DELETE CASCADE;
    END IF;
END$$;
-- Add times lock to tool_master so only admin can edit after locking

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tool_master' AND column_name = 'times_locked'
    ) THEN
        ALTER TABLE tool_master 
        ADD COLUMN times_locked boolean NOT NULL DEFAULT false;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tool_master' AND column_name = 'times_locked_at'
    ) THEN
        ALTER TABLE tool_master 
        ADD COLUMN times_locked_at timestamptz;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tool_master' AND column_name = 'times_locked_by'
    ) THEN
        ALTER TABLE tool_master 
        ADD COLUMN times_locked_by text;
    END IF;
END$$;

COMMENT ON COLUMN tool_master.times_locked IS 'If true, times cannot be edited by non-admin users';
COMMENT ON COLUMN tool_master.times_locked_at IS 'When the times were locked';
COMMENT ON COLUMN tool_master.times_locked_by IS 'Username who locked the times';
