import { supabase } from './lib/supabaseClient.js'

async function testSupabaseConnection() {
  console.log('🔄 Testing Supabase connection...')
  console.log('📍 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not found')
  console.log('🔑 Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'Present' : 'Not found')
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('users').select('*')
    
    if (error) {
      console.error('❌ Supabase connection error:', error)
      console.log('🔍 Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
    } else {
      console.log('✅ Supabase connection successful!')
      console.log('📊 Users data:', data)
      console.log(`👥 Found ${data ? data.length : 0} users`)
      
      if (data && data.length > 0) {
        console.log('📋 User details:')
        data.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.username} (${user.role}) - Active: ${user.active}`)
        })
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    console.log('🔍 Error type:', typeof err)
    console.log('🔍 Error stack:', err.stack)
  }
}

// Run the test
testSupabaseConnection()
  .then(() => {
    console.log('🏁 Connection test completed')
  })
  .catch((err) => {
    console.error('💥 Test script error:', err)
  })