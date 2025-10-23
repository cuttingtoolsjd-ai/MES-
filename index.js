import { supabase } from './lib/supabaseClient.js'

// Example usage of Supabase client
async function testSupabaseConnection() {
  try {
    // Test the connection by fetching user session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.log('Supabase connection test - No active session (this is normal):', error.message)
    } else {
      console.log('Supabase connection successful!')
      if (session) {
        console.log('Active session found:', session.user.email)
      } else {
        console.log('No active user session')
      }
    }
  } catch (error) {
    console.error('Error connecting to Supabase:', error)
  }
}

// Example functions for your Korv Factory App
export async function createKorvRecord(korvData) {
  const { data, error } = await supabase
    .from('korv_products') // Replace with your actual table name
    .insert([korvData])
    .select()

  if (error) {
    console.error('Error creating korv record:', error)
    return { success: false, error }
  }

  return { success: true, data }
}

export async function getKorvProducts() {
  const { data, error } = await supabase
    .from('korv_products') // Replace with your actual table name
    .select('*')

  if (error) {
    console.error('Error fetching korv products:', error)
    return { success: false, error }
  }

  return { success: true, data }
}

// Test the connection when running this file
if (import.meta.url === `file://${process.argv[1]}`) {
  testSupabaseConnection()
}