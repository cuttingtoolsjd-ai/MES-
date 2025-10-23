-- 012_clean_invalid_work_order_ids.sql
-- Clean up stock_movements records with invalid work_order_id values

-- Set work_order_id to NULL for records where it's the string 'null' or other invalid values
UPDATE stock_movements
SET work_order_id = NULL
WHERE work_order_id IS NOT NULL
  AND (
    work_order_id::text = 'null'
    OR length(work_order_id::text) < 36
  );

-- Verify cleanup:
-- SELECT COUNT(*) FROM stock_movements WHERE work_order_id IS NOT NULL AND length(work_order_id::text) < 36;
