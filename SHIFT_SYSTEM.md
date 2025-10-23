# Shift System Overview

## Shift Classifications

The system uses **three shifts per day**:

1. **First Shift** (value: `first`)
2. **Second Shift** (value: `second`)
3. **Night Shift** (value: `night`)

## Shift Progression & Rollover

Work automatically rolls over between shifts in this order:

```
First Shift → Second Shift → Night Shift → (Next Day) First Shift
```

### Rollover Logic

When planning a new shift, the system checks the previous shift for incomplete work:

- If planning **First Shift**: checks **Night Shift** from previous day
- If planning **Second Shift**: checks **First Shift** from same day
- If planning **Night Shift**: checks **Second Shift** from same day

Incomplete assignments are automatically copied to the current shift with:
- A "ROLLOVER" badge (orange background)
- Reference to the original assignment
- Same machine and work order details
- Updated day/shift in the notes

## Implementation Details

### Database Schema

New columns in `machine_assignments` table:
- `is_completed` (boolean) - marks if work is done
- `rolled_over_from` (uuid) - references original assignment
- `completed_at` (timestamptz) - completion timestamp

### Files Updated

1. **lib/rollover.js** - Core rollover logic
2. **migrations/023_add_assignment_rollover.sql** - Database schema
3. **pages/dashboard/admin.js** - Shift options updated
4. **pages/dashboard/manager.js** - Shift options updated
5. **components/FactoryLayout2.js** - Auto-rollover on shift change + visual indicators

### Visual Indicators

In Factory Planning:
- **TRANSFER** badge (pink) - transferred work
- **ROLLOVER** badge (orange) - incomplete work from previous shift
- Both show in the assignment list with colored backgrounds

## Usage

Admins and managers can:
1. Plan work for specific machines, days, and shifts
2. See rollover work automatically added when planning new shifts
3. Track which work is original vs rolled over
4. Mark assignments as completed to prevent unnecessary rollovers
