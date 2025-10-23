-- Add column to track if user must change password on next login
-- This is set to true for all new users with default PIN 000000

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_change_required'
    ) THEN
        ALTER TABLE users ADD COLUMN password_change_required BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Set password_change_required to true for all users with default PIN 000000
UPDATE users 
SET password_change_required = true 
WHERE pin = '000000' AND password_change_required IS NULL;

-- Add comment
COMMENT ON COLUMN users.password_change_required IS 'True if user must change password on next login (e.g., using default PIN 000000)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_password_change_required ON users(password_change_required);
