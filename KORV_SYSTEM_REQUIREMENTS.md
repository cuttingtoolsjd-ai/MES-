# Korv Calculation System - Requirements & Implementation

## Core Principle
**1 korv = 5 minutes**

## Tool Master Changes

### Time Input Fields (instead of direct korv)
Users will input:
- **CNC Time** (minutes) - can be 0
- **Cylindrical Time** (minutes) - can be 0  
- **T&C Time** (minutes) - can be 0
- **NO** coating time (quality handles coating per their tables)
- **NO** quality time (quality handles per their tables)

### Auto-Calculate Korv Per Unit
```
korv_per_unit = (cnc_time + cylindrical_time + tc_time) / 5
```

Example:
- CNC Time: 25 minutes
- Cylindrical Time: 15 minutes
- T&C Time: 10 minutes
- **Total: 50 minutes = 10 korv per unit**

## Work Order Changes

### Total Korv Calculation
```
total_korv = korv_per_unit × quantity
```

Example:
- Korv per unit: 10
- Quantity: 50
- **Total: 500 korv for entire work order**

## Factory Planning Changes

### Partial Quantity Assignment
- Admins/Managers can assign **partial quantities** to machines
- System automatically calculates korv for the assigned portion

Example:
- Work Order: 100 units, 10 korv/unit = 1000 total korv
- Assign 30 units to CNC1 → 300 korv assigned
- Assign 40 units to CNC2 → 400 korv assigned  
- Remaining: 30 units, 300 korv

### Korv Auto-Calculation on Assignment
```javascript
assigned_korv = korv_per_unit × assigned_quantity
```

### Subtract from Machine Capacity
Each assignment reduces the machine's available korv for that shift.

## Shift Capacity Rules

### Standard Shift (8 hours)
```
8 hours = 480 minutes = 96 korv
```

### Machine-Specific Shift Rules

| Machine Type | First Shift | Second Shift | Night Shift |
|--------------|-------------|--------------|-------------|
| **T&C** | ❌ (0 korv) | ✅ (96 korv) | ❌ (0 korv) |
| **CYLN** | ✅ (96 korv) | ✅ (96 korv) | ❌ (0 korv) |
| **All Others** | ✅ (96 korv) | ✅ (96 korv) | ✅ (96 korv) |

## Database Schema

### tool_master
```sql
cnc_time numeric(10,2) DEFAULT 0 NOT NULL
cylindrical_time numeric(10,2) DEFAULT 0 NOT NULL
tc_time numeric(10,2) DEFAULT 0 NOT NULL
standard_korv numeric(10,2) -- calculated: (cnc_time + cylindrical_time + tc_time) / 5
```

### work_orders
```sql
korv_per_unit numeric(10,2) -- from tool_master
total_korv numeric(10,2) -- korv_per_unit * quantity
quantity integer
```

### machine_assignments
```sql
work_order_id uuid
machine text
assigned_korv integer -- calculated from assigned_quantity * korv_per_unit
assigned_quantity integer -- NEW: partial quantity assigned
```

## UI Changes Required

### 1. Tool Master Form
- Remove: "Standard Korv" direct input
- Add: "CNC Time (min)", "Cylindrical Time (min)", "T&C Time (min)"
- Show: Calculated korv per unit (read-only display)

### 2. Work Order Form
- Auto-fetch times from tool_master when tool_code selected
- Auto-calculate and display: korv_per_unit, total_korv
- Both read-only (calculated from times and quantity)

### 3. Factory Planning Assignment
- Input: Assigned Quantity (not korv directly)
- Show: Calculated korv for this assignment
- Validate: Doesn't exceed available machine capacity
- Validate: Doesn't exceed remaining work order quantity

### 4. Machine Capacity Display
- Show: Used korv / Max korv (e.g., "45 / 96 korv")
- Show: Percentage (e.g., "47%")
- Color code: Green < 60%, Yellow 60-85%, Red > 85%
- If machine doesn't work this shift: "Not Available"

## Bulk Import Support

### CSV Format for Tool Master
```csv
tool_code,tool_description,cnc_time,cylindrical_time,tc_time
TOOL001,Carbide End Mill,25,15,10
TOOL002,HSS Drill Bit,0,30,5
TOOL003,Threading Tool,15,0,20
```

System will auto-calculate korv on import.

## Implementation Files

### Created/Updated
1. ✅ `migrations/024_update_korv_calculation_system.sql` - Schema updates
2. ✅ `lib/korvCalculations.js` - Utility functions
3. 🔄 `components/ToolMasterOverview.js` - Update form fields
4. 🔄 `pages/dashboard/admin.js` - Update work order form
5. 🔄 `components/FactoryLayout2.js` - Partial quantity assignment
6. 🔄 `lib/assignments.js` - Update assignment logic
7. 🔄 `lib/machines.js` - Shift-specific capacity

### Functions Available
- `minutesToKorv(minutes)` - Convert time to korv
- `korvToMinutes(korv)` - Convert korv to time
- `calculateKorvPerUnit(cncTime, cylindricalTime, tcTime)` - Get korv/unit
- `calculateTotalKorv(korvPerUnit, quantity)` - Get total work order korv
- `calculateAssignmentKorv(korvPerUnit, assignedQty)` - Get assignment korv
- `getMachineShiftCapacity(machineId, shift)` - Get capacity or 0
- `validateAssignmentCapacity(used, assignment, max)` - Check if fits

## Migration Steps

1. Run migration 024 to update schema
2. Update existing tool_master records with times (if they have korv, reverse calculate or set to 0)
3. Bulk import new tools with times
4. Update UI components to use time inputs
5. Update factory planning to use partial quantities
6. Test rollover with new korv calculations

## Example Workflow

1. **Admin adds tool to master:**
   - CNC: 30 min, Cylindrical: 20 min, T&C: 10 min
   - System calculates: 60 min / 5 = **12 korv/unit**

2. **Manager creates work order:**
   - Tool: TOOL001 (12 korv/unit)
   - Quantity: 100 units
   - System calculates: **1200 total korv**

3. **Factory Planning - First Shift:**
   - Assign 40 units to CNC1
   - System calculates: 40 × 12 = **480 korv assigned**
   - CNC1 capacity: 96 korv per shift
   - ❌ **Error: Exceeds capacity!** (need ~5 machines or split across shifts)

4. **Corrected Assignment:**
   - Assign 8 units to CNC1 (first shift) = 96 korv ✅
   - Assign 8 units to CNC2 (first shift) = 96 korv ✅
   - Assign 8 units to CNC1 (second shift) = 96 korv ✅
   - ... continue planning

5. **T&C Assignment:**
   - Can ONLY assign to second shift
   - Other shifts show "Not Available" for T&C machines
