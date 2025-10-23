-- Migration: Add login/logout timestamp tracking
-- Description: Adds last_login and last_logout columns to users table for attendance and activity tracking

-- Add last_login column (timestamp when user last logged in)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Add last_logout column (timestamp when user last logged out)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_logout TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on login times
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Create index for faster queries on logout times
CREATE INDEX IF NOT EXISTS idx_users_last_logout ON users(last_logout);

-- Add comment to document the columns
COMMENT ON COLUMN users.last_login IS 'Timestamp when user last successfully logged in';
COMMENT ON COLUMN users.last_logout IS 'Timestamp when user last logged out';
