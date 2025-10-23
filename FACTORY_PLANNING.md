# Factory Planning Logic

## Overview
Factory planning includes manual completion controls for work orders. Managers decide when factory planning is complete by clicking the "End Planning" button.

## Manual Control

Managers and admins can manually end factory planning for any work order using the **"End Planning"** button in the Factory Layout popup. This:

1. Shows a confirmation dialog asking "Are you sure you want to end factory planning for work order [WO#]?"
2. If confirmed, sets `factory_planning_ended = true` in the database
3. Records the timestamp in `factory_planning_ended_at`
4. Removes the work order from the active planning list
5. Shows success message: "✅ Factory planning ended for work order [WO#]"

## Database Changes

New migration: `016_add_factory_planning_ended.sql`

Columns added to `work_orders` table:
- `factory_planning_ended` (BOOLEAN, default FALSE): Indicates if planning is complete
- `factory_planning_ended_at` (TIMESTAMPTZ): Timestamp when planning was ended

## UI Features

### Factory Layout Popup
Each work order now shows:
- **Coating indicator** (if applicable): "🎨 Coating: [type]"
- **Marking indicator** (if applicable): "✏️ Marking: [text]"
- **End Planning button**: Green button that allows manual completion

### Filtering
Work orders with `factory_planning_ended = true` are automatically filtered out from:
- Factory planning assignment lists
- Open work orders queries

## Workflow

1. Admin/Manager creates work order
2. Manager assigns work to machines across departments (CNC, Cylindrical, T&C, Quality/Coating)
3. When manager decides planning is complete, they click "End Planning"
4. System asks for confirmation
5. After confirmation, work order is removed from factory planning and moves to next stage

## Benefits

- **Manual control**: Manager decides when planning is complete
- **Safety**: Confirmation dialog prevents accidental clicks
- **Clear feedback**: Success messages confirm the action
- **Audit trail**: Timestamp records when planning was completed
- **Clean UI**: Ended work orders are automatically hidden from planning view
