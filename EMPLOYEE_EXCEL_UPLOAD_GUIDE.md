# Employee Excel Upload Guide

## Excel File Structure

### Required Column Headers (Exact Names):
Your Excel file must have these column headers in the **first row**:

| username | pin | role | active |
|----------|-----|------|--------|

## Column Descriptions

### 1. **username** (Required)
- Employee's unique username
- Used for login
- Must be unique (no duplicates)
- Example: `JohnDoe`, `MarySingh`, `Anil`, `Anushwa`, `Jayant`

### 2. **pin** (Required)
- Employee's password/PIN
- Minimum 6 characters recommended
- Use `000000` for initial password (users can change it later via Settings)
- Example: `000000`, `123456`, `password123`

### 3. **role** (Required)
- Employee's role in the system
- **Allowed values ONLY:**
  - `admin` - Full access to all features
  - `manager` - Can create work orders, manage planning
  - `operator` - Can view and update assigned machines
- Example: `operator`, `manager`, `admin`

### 4. **active** (Optional)
- Whether the employee account is active
- **Allowed values:**
  - `true` or `TRUE` or `1` - Active account (default)
  - `false` or `FALSE` or `0` - Inactive account
- If left empty, defaults to `true`
- Example: `true`, `false`

**Note:** Machine assignments and korv numbers are managed separately within the application, not during upload.

## Example Excel File

### Example 1: Basic Operators
| username | pin | role | active |
|----------|-----|------|--------|
| Anil | 000000 | operator | true |
| Rajesh | 000000 | operator | true |
| Priya | 000000 | operator | true |

### Example 2: Mixed Roles
| username | pin | role | active |
|----------|-----|------|--------|
| Anushwa | 000000 | admin | true |
| Jayant | 000000 | admin | true |
| Suresh | 123456 | manager | true |
| Amit | 000000 | operator | true |
| Neha | 000000 | operator | true |

### Example 3: Inactive Users
| username | pin | role | active |
|----------|-----|------|--------|
| TempWorker | 000000 | operator | false |
| OldEmployee | 000000 | operator | false |

## How to Upload to Database

### Method 1: Using Supabase Studio (Recommended)
1. Open your Supabase project dashboard
2. Go to **Table Editor**
3. Select the **users** table
4. Click **Insert** → **Import data from CSV**
5. Save your Excel file as CSV:
   - In Excel: File → Save As → Choose "CSV (Comma delimited) (*.csv)"
6. Upload the CSV file
7. Map the columns if needed
8. Click **Import**

### Method 2: Using pgAdmin or Database Client
1. Save Excel as CSV
2. Connect to your PostgreSQL database
3. Right-click on `users` table → **Import/Export Data**
4. Select your CSV file
5. Choose "Import"
6. Map columns to match database fields
7. Execute import

### Method 3: Using SQL INSERT Statements
If you prefer SQL, convert your Excel data to INSERT statements like this:

```sql
INSERT INTO users (username, pin, role, active) VALUES
('Anil', '000000', 'operator', true),
('Rajesh', '000000', 'operator', true),
('Priya', '000000', 'operator', true),
('Anushwa', '000000', 'admin', true),
('Jayant', '000000', 'admin', true);
```

## Important Notes

### ✅ Do's:
- Use exact column header names (case-sensitive)
- Ensure usernames are unique
- Set initial PIN to `000000` so users can change it
- Use valid role values: `admin`, `manager`, or `operator`
- Save as CSV before uploading

### ❌ Don'ts:
- Don't use spaces in column headers
- Don't leave username, pin, or role empty
- Don't duplicate usernames
- Don't use invalid role values (only use: admin, manager, operator)

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
- **Cause:** Username already exists in database
- **Solution:** Check for duplicates in your Excel file or use different usernames

### Error: "null value in column violates not-null constraint"
- **Cause:** Required field (username, pin, or role) is empty
- **Solution:** Fill in all required fields

### Error: "invalid input value for enum"
- **Cause:** Invalid role value (not admin/manager/operator)
- **Solution:** Use only allowed role values

## Sample Excel Template

You can create a blank template with just the headers:

| username | pin | role | active |
|----------|-----|------|--------|
|          |     |      |        |

Then fill in your employee data below the headers.

## After Upload

After uploading employees:
1. Verify the import in Supabase Studio or database client
2. Test login with a sample user
3. Notify employees to change their default PIN via Settings (⚙️ Settings button)
4. Machine assignments can be added later through the admin dashboard if needed

## Need Help?

If you encounter issues:
1. Check your Excel column headers match exactly
2. Verify all required fields are filled
3. Ensure no duplicate usernames or korv numbers
4. Check that role values are valid
5. Review the error message for specific column/row issues
