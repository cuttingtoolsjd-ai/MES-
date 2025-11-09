-- 033_require_contact_person.sql
-- Ensure every customer row has a contact_person and enforce NOT NULL constraint.

-- Backfill blank or NULL contact_person with placeholder
UPDATE customers SET contact_person = 'UNKNOWN' WHERE contact_person IS NULL OR trim(contact_person) = '';

ALTER TABLE customers ALTER COLUMN contact_person SET NOT NULL;

COMMENT ON COLUMN customers.contact_person IS 'Primary contact person for the customer (required)';
