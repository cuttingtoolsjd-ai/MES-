-- Add korv column to users table to map korv IDs to user names
-- This allows us to display operator names instead of just korv numbers

-- Add korv column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'korv'
    ) THEN
        ALTER TABLE users ADD COLUnMN korv integer UNIQUE;
    END IF;
END $$;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_korv ON users(korv);

-- Update existing users with korv numbers (adjust these as needed)
-- You can add more operators as needed
UPDATE users SET korv = 1 WHERE username = 'Anil' AND korv IS NULL;
UPDATE users SET korv = 2 WHERE username = 'Anushwa' AND korv IS NULL;
UPDATE users SET korv = 3 WHERE username = 'Dhanashree' AND korv IS NULL;

COMMENT ON COLUMN users.korv IS 'Korv ID/badge number for the user';
