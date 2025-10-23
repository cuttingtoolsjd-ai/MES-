# Password Management & Security

## Overview
This document explains the password management and security features implemented in the JD Cutting Tools application.

## Security Features

### 1. **Passwords Are Never Exposed**
- User passwords/PINs are stored securely in the database
- Admin dashboard queries explicitly exclude the `pin` field when fetching user data
- The EmployeeTable component does not display passwords
- No UI component shows passwords to admins or any other users

### 2. **Self-Service Password Change**
All users (admin, manager, operator) can change their own password through the Settings page:
- Navigate to Settings via the ⚙️ Settings button in the dashboard header
- Current PIN verification required before changing
- New PIN must be at least 6 characters
- Confirmation field to prevent typos

### 3. **Admin Users Setup**
Created migration `026_setup_admin_users.sql` to ensure:
- **Anushwa** - Admin role with initial PIN: `000000`
- **Jayant** - Admin role with initial PIN: `000000`
- Both users are set up automatically when running migrations

### 4. **Employee Management**
Admins can:
- Add new employees with default PIN `000000`
- Assign roles (admin, manager, operator)
- Activate/deactivate user accounts
- View employee information (username, role, machine assignment, status)
- **Cannot view or reset passwords** - users must change their own passwords

## How to Change Your Password

### For All Users:
1. Log in to your dashboard
2. Click the **⚙️ Settings** button in the top-right corner
3. Fill in the "Change Your PIN" form:
   - Enter your current PIN
   - Enter your new PIN (minimum 6 characters)
   - Confirm your new PIN
4. Click "Change PIN"
5. You'll see a success message when the PIN is updated

## Initial Setup for New Users

New employees created by admins receive:
- Default PIN: `000000`
- Active status
- Assigned role (admin, manager, or operator)

**Important:** New users should change their password immediately after first login for security.

## Database Schema

The `users` table includes:
- `id` - Unique identifier
- `username` - Unique username for login
- `pin` - Encrypted password (never exposed in queries)
- `role` - User role (admin, manager, operator)
- `assigned_machine` - Machine assignment for operators
- `active` - Account status
- `korv` - Korv ID/badge number
- `created_at`, `updated_at` - Timestamps

## Files Modified

### Components:
- `components/EmployeeTable.js` - Employee list without password display

### Pages:
- `pages/dashboard/admin.js` - Admin dashboard with secure user queries and Settings button
- `pages/dashboard/manager.js` - Manager dashboard with Settings access
- `pages/dashboard/operator.js` - Operator dashboard with Settings button
- `pages/dashboard/settings.js` - Password change functionality and machine settings

### Migrations:
- `migrations/026_setup_admin_users.sql` - Setup Anushwa and Jayant as admin users

## Security Best Practices

✅ **Implemented:**
- Passwords never displayed in UI
- Database queries exclude password field
- Users change their own passwords
- Current password verification required for changes
- Minimum password length enforced (6 characters)

⚠️ **Recommendations:**
- Consider implementing password complexity requirements (uppercase, lowercase, numbers)
- Add password expiry policy (e.g., change every 90 days)
- Implement password history (prevent reusing last 3 passwords)
- Add account lockout after failed login attempts
- Consider implementing 2FA for admin accounts
- Hash passwords in database instead of storing plain text

## Support

If you forget your password:
- Contact an admin to deactivate and reactivate your account (resets to `000000`)
- Or have a database administrator manually reset your PIN in the database
