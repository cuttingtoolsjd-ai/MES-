# Database Schema - Users Table

## Overview
The users table manages authentication and role assignment for the Korv Factory App.

## Table Structure

```sql
create table users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  pin text not null,
  role text,
  assigned_machine text,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## Fields Description

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `username` | TEXT | Unique username for login |
| `pin` | TEXT | PIN code for authentication |
| `role` | TEXT | User role: admin, manager, operator |
| `assigned_machine` | TEXT | Machine assigned to user |
| `active` | BOOLEAN | Account status (default: true) |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

## Initial Users

| Username | PIN | Role |
|----------|-----|------|
| Anushwa | 000000 | admin |
| Dhanashree | 000000 | manager |
| Anil | 000000 | operator |

## Setup Options

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase dashboard: https://app.supabase.com/project/kxepeapbiupctsvmkcjn
2. Navigate to the SQL Editor
3. Copy and paste the SQL from `migrations/001_create_users_table.sql`
4. Run the query

### Option 2: Using JavaScript (if table exists)
```bash
node insert-users.js
```

### Option 3: Manual API calls
```js
import { supabase } from './lib/supabaseClient.js'

// Insert users
const { data, error } = await supabase
  .from('users')
  .insert([
    { username: 'Anushwa', pin: '000000', role: 'admin' },
    { username: 'Dhanashree', pin: '000000', role: 'manager' },
    { username: 'Anil', pin: '000000', role: 'operator' }
  ])
```

## Usage Examples

### Authenticate User
```js
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('username', 'Anushwa')
  .eq('pin', '000000')
  .eq('active', true)
  .single()
```

### Get All Active Users
```js
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('active', true)
  .order('username')
```

### Assign Machine to User
```js
const { data, error } = await supabase
  .from('users')
  .update({ assigned_machine: 'CNC-001' })
  .eq('username', 'Anil')
```

## Security Notes

- **PIN Security**: Consider hashing PINs before storing
- **Row Level Security**: The migration includes RLS policies
- **Indexes**: Created on username and role for performance
- **Validation**: Add constraints as needed for your business rules

## Next Steps

1. Create the table using one of the methods above
2. Test authentication with the provided users
3. Implement proper PIN hashing if needed
4. Add additional fields as your app requirements grow