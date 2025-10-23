import { supabase } from './lib/supabaseClient.js'

// Function to create users table and insert initial data
export async function setupUsersTable() {
  try {
    console.log('🔄 Setting up users table...')

    // Create the users table
    const { data: createTableData, error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        create table if not exists users (
          id uuid primary key default uuid_generate_v4(),
          username text unique not null,
          pin text not null,
          role text,
          assigned_machine text,
          active boolean default true,
          created_at timestamp with time zone default timezone('utc'::text, now()) not null,
          updated_at timestamp with time zone default timezone('utc'::text, now()) not null
        );
      `
    })

    if (createTableError) {
      console.error('❌ Error creating users table:', createTableError)
      return { success: false, error: createTableError }
    }

    console.log('✅ Users table created successfully')

    // Insert initial users
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([
        { username: 'Anushwa', pin: '000000', role: 'admin' },
        { username: 'Dhanashree', pin: '000000', role: 'manager' },
        { username: 'Anil', pin: '000000', role: 'operator' }
      ])
      .select()

    if (insertError) {
      console.error('❌ Error inserting users:', insertError)
      return { success: false, error: insertError }
    }

    console.log('✅ Initial users inserted successfully:', insertData)
    return { success: true, data: insertData }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return { success: false, error }
  }
}

// Function to get all users
export async function getAllUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Error fetching users:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return { success: false, error }
  }
}

// Function to authenticate user with username and PIN
export async function authenticateUser(username, pin) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('pin', pin)
      .eq('active', true)
      .single()

    if (error) {
      console.error('❌ Authentication failed:', error)
      return { success: false, error: 'Invalid credentials' }
    }

    console.log('✅ User authenticated:', data.username, '-', data.role)
    return { success: true, user: data }
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return { success: false, error }
  }
}

// Function to update user's assigned machine
export async function assignMachine(userId, machineId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ assigned_machine: machineId, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error assigning machine:', error)
      return { success: false, error }
    }

    console.log('✅ Machine assigned successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return { success: false, error }
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Running users table setup...')
  
  setupUsersTable()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Setup completed successfully!')
        
        // Test by fetching all users
        return getAllUsers()
      } else {
        console.log('\n❌ Setup failed:', result.error)
      }
    })
    .then(result => {
      if (result && result.success) {
        console.log('\n👥 Current users:')
        result.data.forEach(user => {
          console.log(`  - ${user.username} (${user.role}) - Active: ${user.active}`)
        })
      }
    })
    .catch(error => {
      console.error('❌ Script error:', error)
    })
}