# Korv Factory App - Next.js + Supabase

This is a Next.js application with Supabase integration for your Korv Factory management system.

## Setup Complete ✅

- ✅ Next.js application structure with Pages Router
- ✅ Supabase client configured with environment variables
- ✅ User authentication system with PIN-based login
- ✅ Dashboard with role-based access control
- ✅ Machine assignment functionality
- ✅ Responsive design with custom CSS

## Project Structure

### Core Files
- `lib/supabaseClient.js` - Supabase client configuration using environment variables
- `.env.local` - Environment variables for Next.js (Supabase URL and API key)
- `next.config.js` - Next.js configuration
- `package.json` - Project dependencies and scripts

### Pages
- `pages/index.js` - Home page showing users and setup instructions
- `pages/login.js` - PIN-based authentication page
- `pages/dashboard.js` - Role-based dashboard with machine assignment
- `pages/_app.js` - Next.js app wrapper

### Components
- `components/UserTable.js` - Reusable user table component

### Database
- `migrations/001_create_users_table.sql` - SQL migration for users table
- `DATABASE.md` - Complete database documentation

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Database
1. Go to your Supabase dashboard: https://app.supabase.com/project/kxepeapbiupctsvmkcjn
2. Navigate to SQL Editor
3. Copy and paste the SQL from `migrations/001_create_users_table.sql`
4. Run the query to create the users table and insert initial users

### 3. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Test the Application
- Visit the home page to see the users table
- Go to `/login` to test authentication with:
  - **Anushwa** (admin) - PIN: 000000
  - **Dhanashree** (manager) - PIN: 000000  
  - **Anil** (operator) - PIN: 000000
- Access the dashboard after login for role-based features

## Features

### 🔐 Authentication
- PIN-based user authentication
- Role-based access control (admin, manager, operator)
- Session management with localStorage

### 👥 User Management
- View all users with their roles and status
- Real-time user data from Supabase
- User activation/deactivation (admin only)

### 🔧 Machine Assignment
- Assign machines to users (admin/manager only)
- Track machine assignments
- Update assignments in real-time

### 📱 Responsive Design
- Mobile-friendly interface
- Custom CSS with professional styling
- Accessible components

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run setup-users` - Run user setup script
- `npm run insert-users` - Insert users (if table exists)

## Environment Variables

The application uses these environment variables in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_KEY` - Your Supabase anon key

## Troubleshooting

If you encounter file locking issues (common with OneDrive), try:
1. Move the project to a local folder (not synced with OneDrive)
2. Or exclude `node_modules` from OneDrive sync
3. Run `npm install` again if needed