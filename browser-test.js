// Simple test script to check Supabase connection and create users
// Run this in the browser console on http://localhost:3000/login

async function quickTest() {
  console.log('🔄 Testing Supabase connection...');
  
  try {
    // First, try to select from users table
    console.log('1️⃣ Testing table access...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Table access failed:', testError.message);
      
      if (testError.message.includes('relation "users" does not exist')) {
        console.log('🔧 Users table does not exist. You need to create it first.');
        console.log('📋 Steps to fix:');
        console.log('   1. Go to https://app.supabase.com/project/kxepeapbiupctsvmkcjn');
        console.log('   2. Click on "SQL Editor"');
        console.log('   3. Run the SQL from migrations/001_create_users_table.sql');
        return;
      }
    } else {
      console.log('✅ Table access successful!');
    }
    
    // Try to get all users
    console.log('2️⃣ Fetching users...');
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*');
    
    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError);
    } else {
      console.log('✅ Users fetched successfully:', users);
      console.log(`👥 Found ${users.length} users`);
      
      if (users.length === 0) {
        console.log('📝 No users found. Attempting to insert initial users...');
        
        const { data: insertData, error: insertError } = await supabase
          .from('users')
          .insert([
            { username: 'Anushwa', pin: '000000', role: 'admin' },
            { username: 'Dhanashree', pin: '000000', role: 'manager' },
            { username: 'Anil', pin: '000000', role: 'operator' }
          ])
          .select();
        
        if (insertError) {
          console.error('❌ Error inserting users:', insertError);
        } else {
          console.log('✅ Users inserted successfully:', insertData);
        }
      }
    }
    
    // Test authentication
    console.log('3️⃣ Testing authentication...');
    const { data: authTest, error: authError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'Anushwa')
      .eq('pin', '000000')
      .single();
    
    if (authError) {
      console.error('❌ Authentication test failed:', authError);
    } else {
      console.log('✅ Authentication test successful:', authTest);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Auto-run the test
quickTest();

// Also make it available globally for manual testing
window.quickTest = quickTest;