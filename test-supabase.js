import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables first
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('🔄 Testing Supabase connection...')

    // Test basic connection
    const { data, error } = await supabase.from('users').select('count').limit(1)

    if (error) {
      console.error('❌ Connection error:', error.message)
      return false
    }

    console.log('✅ Supabase connection successful')

    // Check if chat_messages table exists
    const { data: tableData, error: tableError } = await supabase
      .from('chat_messages')
      .select('id')
      .limit(1)

    if (tableError && tableError.code === 'PGRST116') {
      console.log('❌ chat_messages table does not exist')
      return false
    } else if (tableError) {
      console.error('❌ Error checking table:', tableError.message)
      return false
    } else {
      console.log('✅ chat_messages table exists')
      return true
    }

  } catch (error) {
    console.error('❌ Test error:', error)
    return false
  }
}

testConnection().then(exists => {
  if (!exists) {
    console.log('\n📋 Please run the following SQL in your Supabase SQL editor:')
    console.log(`
-- Create chat_messages table for team communication
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(50) NOT NULL,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);

-- Enable RLS (Row Level Security)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read messages
CREATE POLICY "Allow authenticated users to read chat messages" ON chat_messages
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to insert their own messages
CREATE POLICY "Allow authenticated users to insert chat messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Create policy to allow users to update their own messages (for editing)
CREATE POLICY "Allow users to update their own messages" ON chat_messages
    FOR UPDATE USING (auth.uid() = sender_id);
    `)
  }
  process.exit(exists ? 0 : 1)
})