-- Setup admin users: Anushwa and Jayant with initial password 000000
-- This migration ensures both admin users exist with correct roles

-- Insert Anushwa as admin (if not exists)
INSERT INTO users (username, pin, role, active)
SELECT 'Anushwa', '000000', 'admin', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'Anushwa');

-- Insert Jayant as admin (if not exists)
INSERT INTO users (username, pin, role, active)
SELECT 'Jayant', '000000', 'admin', true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'Jayant');

-- Update existing Anushwa to admin role if it exists but has different role
UPDATE users 
SET role = 'admin', active = true 
WHERE username = 'Anushwa' AND role != 'admin';

-- Update existing Jayant to admin role if it exists but has different role
UPDATE users 
SET role = 'admin', active = true 
WHERE username = 'Jayant' AND role != 'admin';

-- Add comment
COMMENT ON TABLE users IS 'Users table with secure PIN storage. PINs should never be exposed in queries or UI.';
