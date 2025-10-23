-- Create users table for Korv Factory App
CREATE TABLE IF NOT EXISTS users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  pin text not null,
  role text,
  assigned_machine text,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert initial users (only if they don't exist)
INSERT INTO users (username, pin, role)
SELECT 'Anushwa', '000000', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'Anushwa');

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username on users(username);

-- Create an index on role for filtering
CREATE INDEX IF NOT EXISTS idx_users_role on users(role);

-- Enable Row Level Security (RLS)
-- ALTER TABLE users enable row level security;

-- Add comments for documentation
comment on table users is 'Users table for Korv Factory App authentication and role management';
comment on column users.id is 'Unique identifier for each user';
comment on column users.username is 'Unique username for login';
comment on column users.pin is 'PIN for authentication';
comment on column users.role is 'User role: admin, manager, operator';
comment on column users.assigned_machine is 'Machine assigned to the user';
comment on column users.active is 'Whether the user account is active';