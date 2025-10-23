import { supabase } from './lib/supabaseClient.js'

// Simple function to insert users (assumes table already exists in Supabase)
export async function insertInitialUsers() {
  try {
    console.log('🔄 Inserting initial users...')

    // Insert the users
    const { data, error } = await supabase
      .from('users')
      .upsert([
        { username: 'Anushwa', pin: '000000', role: 'admin' },
        { username: 'Dhanashree', pin: '000000', role: 'manager' },
        { username: 'Anil', pin: '000000', role: 'operator' }
      ], {
        onConflict: 'username',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('❌ Error inserting users:', error)
      return { success: false, error }
    }

    console.log('✅ Users inserted/updated successfully:', data)
    return { success: true, data }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return { success: false, error }
  }
}

// Function to test user authentication
export async function testAuthentication() {
  console.log('\n🔐 Testing user authentication...')
  
  const testUsers = [
    { username: 'Anushwa', pin: '000000' },
    { username: 'Dhanashree', pin: '000000' },
    { username: 'Anil', pin: '000000' }
  ]

  for (const testUser of testUsers) {
    const { data, error } = await supabase
      .from('users')
      .select('username, role, assigned_machine, active')
      .eq('username', testUser.username)
      .eq('pin', testUser.pin)
      .eq('active', true)
      .single()

    if (error) {
      console.log(`❌ ${testUser.username}: Authentication failed`)
    } else {
      console.log(`✅ ${data.username}: ${data.role} (Active: ${data.active})`)
    }
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Setting up users...')
  
  insertInitialUsers()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Users setup completed!')
        return testAuthentication()
      } else {
        console.log('\n❌ Setup failed. You may need to create the table in Supabase first.')
        console.log('Use the SQL in migrations/001_create_users_table.sql')
      }
    })
    .catch(error => {
      console.error('❌ Script error:', error)
    })
}