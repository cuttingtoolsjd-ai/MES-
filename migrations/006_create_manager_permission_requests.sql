-- Drop table if it exists to recreate completely
DROP TABLE IF EXISTS manager_permission_requests CASCADE;

-- Create manager_permission_requests table with all required columns
CREATE TABLE manager_permission_requests (
    id SERIAL PRIMARY KEY,
    requested_by VARCHAR(100) NOT NULL,
    tool_code VARCHAR(50) NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('edit', 'delete')),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    tool_data JSONB -- Store the tool data for edit requests
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_manager_permission_requests_status ON manager_permission_requests(status);
CREATE INDEX IF NOT EXISTS idx_manager_permission_requests_requested_by ON manager_permission_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_manager_permission_requests_tool_code ON manager_permission_requests(tool_code);

-- Enable RLS (Row Level Security)
ALTER TABLE manager_permission_requests ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to read permission requests
CREATE POLICY "Allow read permission requests" ON manager_permission_requests
    FOR SELECT USING (true);

-- Policy to allow all authenticated users to insert permission requests
CREATE POLICY "Allow insert permission requests" ON manager_permission_requests
    FOR INSERT WITH CHECK (true);

-- Policy to allow all authenticated users to update permission requests
CREATE POLICY "Allow update permission requests" ON manager_permission_requests
    FOR UPDATE USING (true);