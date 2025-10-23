-- 013_prevent_multiple_raw_issues.sql
-- Prevent issuing RAW material more than once to the same work order
-- Business rule: For each work_order_id, allow at most one ISSUE where the item belongs to RAW group.

-- Create a function that raises an exception if duplicate RAW issue is attempted
CREATE OR REPLACE FUNCTION prevent_multiple_raw_issues()
RETURNS trigger AS $$
DECLARE
  raw_issue_exists boolean;
BEGIN
  -- Only enforce on ISSUE rows with a work_order_id and when the item is RAW
  IF NEW.action <> 'ISSUE' OR NEW.work_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if the item is RAW
  PERFORM 1 FROM stock_items si WHERE si.id = NEW.item_id AND si.group_code = 'RAW';
  IF NOT FOUND THEN
    RETURN NEW; -- Not a RAW item; allow
  END IF;

  -- If there is already a RAW ISSUE for this work order, block
  SELECT EXISTS (
    SELECT 1
    FROM stock_movements sm
    JOIN stock_items si2 ON si2.id = sm.item_id
    WHERE sm.work_order_id = NEW.work_order_id
      AND sm.action = 'ISSUE'
      AND sm.reversed_at IS NULL
      AND si2.group_code = 'RAW'
  ) INTO raw_issue_exists;

  IF raw_issue_exists THEN
    RAISE EXCEPTION 'A RAW material has already been issued for this work order. Please reverse the previous entry first.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to stock_movements
DROP TRIGGER IF EXISTS trg_prevent_multiple_raw_issues ON stock_movements;
CREATE TRIGGER trg_prevent_multiple_raw_issues
BEFORE INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION prevent_multiple_raw_issues();
