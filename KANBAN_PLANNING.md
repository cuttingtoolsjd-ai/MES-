# Factory Planning Kanban - Game-like Drag & Drop Interface

## 🎮 Overview
The new **Planning Kanban** provides a visual, interactive, game-like interface for factory planning. Drag and drop work orders onto machines to assign production with real-time capacity feedback.

## ✨ Key Features

### 1. **Three-Column Kanban Board**
- **📋 Unplanned**: Work orders with no assignments yet
- **⚡ Half-Planned**: Work orders with partial assignments across departments
- **✅ Fully Planned**: Work orders completely assigned to all required departments

### 2. **Drag & Drop Assignment**
- Drag work order cards from any column
- Drop onto machine tiles to assign
- Visual feedback when dragging over machines
- Machines show "FULL" indicator when at capacity

### 3. **Machine Capacity Visualization**
- Color-coded capacity bars:
  - 🟢 Green: <80% capacity
  - 🟡 Yellow: 80-99% capacity
  - 🔴 Red: 100% capacity (FULL)
- Real-time capacity updates
- Prevents over-assignment

### 4. **Quantity-Based Assignment**
Instead of partial korv, you now assign by **quantity**:
- Assign full quantity or partial quantity
- Each department needs the full work order quantity
- Machine capacity tracked in units (not korv)

### 5. **Smart Department Detection**
Work orders show which departments they need:
- ⚙️ **CNC**: If cnc_time > 0
- 🔵 **Cylindrical**: If cylindrical_time > 0  
- 🔧 **T&C**: If tc_estimated > 0
- ✅ **Quality**: If organisational_korv > 0 OR coating required

### 6. **Department Progress Badges**
Each work order card shows:
- Department icons with assigned/needed quantities
- Example: "⚙️ CNC 30/50" means 30 assigned out of 50 needed
- Completed departments show strikethrough

### 7. **Visual Feedback**
- 🎨 Coating indicator for work orders requiring coating
- ✏️ Marking indicator when marking is specified
- Hover effects on machine tiles
- Scale animation when dragging over machines
- Success/error messages for all actions

## 🎯 Workflow

### Step 1: View Work Orders
Work orders automatically sort into columns based on planning status:
```
Unplanned → Half-Planned → Fully Planned
```

### Step 2: Drag to Assign
1. Click and hold a work order card
2. Drag to the appropriate machine (matches department color)
3. Release to drop

### Step 3: Assignment Modal
Modal shows:
- Work order details
- Department being assigned
- Available quantity (remaining to assign)
- Machine remaining capacity

Choose:
- **Assign Full Quantity**: Assigns all remaining units
- **Assign Partial**: Enter custom quantity (1 to max available)

### Step 4: Real-time Updates
- Work order moves between columns as it gets planned
- Machine capacity bars update
- Department badges update with new assignments

## 🏗️ Database Schema

### New Column: `assigned_quantity`
Migration: `017_add_assigned_quantity.sql`

```sql
ALTER TABLE machine_assignments 
ADD COLUMN assigned_quantity INTEGER DEFAULT 0;
```

This tracks the **quantity of units** assigned (not korv).

## 🎨 UI Elements

### Work Order Card
```
┌─────────────────────────┐
│ WO12345                 │ ← Work Order Number
│ TC001 - Tool Desc       │ ← Tool Code & Description
│ Qty: 50                 │ ← Total Quantity
│                         │
│ ⚙️ CNC 30/50            │ ← Department Progress
│ 🔵 CYL 0/50             │
│ ✅ QUALITY 0/50         │
│                         │
│ 🎨 TiN Coating          │ ← Coating (if applicable)
│ ✏️ Logo XYZ             │ ← Marking (if applicable)
└─────────────────────────┘
```

### Machine Tile
```
┌───────────────┐
│   CNC1        │ ← Machine Label
│   CNC         │ ← Department
│               │
│ ████████░░    │ ← Capacity Bar (80%)
│   40/50       │ ← Current/Max
└───────────────┘
```

When FULL:
```
┌───────────────┐
│   CNC1  [FULL]│
│   CNC         │
│               │
│ ██████████    │ ← Red bar
│   50/50       │
└───────────────┘
```

## 🚫 Validation Rules

### 1. Department Requirement
- Can only assign to machines matching required departments
- Example: If WO doesn't need CNC, can't drop on CNC machines
- Error: "❌ WO12345 does not need CNC department"

### 2. Quantity Limits
- Cannot assign more than remaining quantity for that department
- Error: "❌ WO12345 already fully assigned to CNC"

### 3. Machine Capacity
- Cannot exceed machine capacity
- Example: If machine has 10 units free, can't assign 20
- Error: "❌ Machine CNC1 only has 10 capacity available (40/50 used)"

### 4. Fully-Planned Lock
- Fully-planned work orders cannot be dragged
- Card appears faded with cursor-not-allowed
- Prevents accidental over-assignment

## 📊 Machine Capacities

Default capacities (in units):
- **CNC machines**: 50 units
- **Cylindrical machines**: 40 units
- **T&C machines**: 60 units
- **Quality/Coating**: 30-40 units

*Note: These can be adjusted in the component or database.*

## 🔄 Integration Points

### Manager Dashboard
New tile added:
```
🎮 Planning Kanban
"Drag & drop planning board"
```

Separate from existing Factory Layout (machine view).

### Data Flow
1. Loads open work orders (not factory_planning_ended)
2. Fetches tool master data for department requirements
3. Queries machine_assignments for current assignments
4. Computes planning status and remaining quantities
5. Groups into kanban columns

### Day/Shift Filtering
Same controls as Factory Layout:
- Select specific day (date picker)
- Select shift (morning/night/afternoon)
- Assignments filtered by day+shift combination

## 🎯 Benefits

### 1. **Visual Clarity**
See planning status at a glance with color-coded columns

### 2. **Intuitive Interaction**
Drag and drop is faster than form-based assignment

### 3. **Prevents Errors**
Built-in validation prevents over-assignment and wrong departments

### 4. **Real-time Feedback**
Instant updates show impact of assignments

### 5. **Game-like Experience**
Engaging interface makes planning fun and efficient

### 6. **Quantity-Based Logic**
Simpler than korv-based partial assignments

## 🔮 Future Enhancements

Potential additions:
- [ ] Save machine capacity presets
- [ ] Auto-suggest best machine for work order
- [ ] Undo/redo assignment actions
- [ ] Batch assign multiple work orders
- [ ] Timeline view showing day-by-day planning
- [ ] Export planning schedule to PDF
- [ ] Mobile touch/swipe support
- [ ] Color themes for different shifts

## 🐛 Troubleshooting

### Work orders not appearing?
- Check if they're marked as `factory_planning_ended`
- Verify status is not 'completed', 'done', 'closed', or 'released'

### Can't drop work order on machine?
- Ensure department matches (CNC to CNC machines, etc.)
- Check if quantity is already fully assigned for that department
- Verify machine has available capacity

### Capacity bar not updating?
- Refresh the page
- Check if assignments have correct day/shift in notes
- Verify `assigned_quantity` column exists in database

## 📝 Files Modified

1. **components/FactoryPlanningKanban.js** - New Kanban component
2. **pages/dashboard/manager.js** - Added new tile and tab
3. **migrations/017_add_assigned_quantity.sql** - Database migration
4. **lib/assignments.js** - Already supports quantity-based queries

---

**Happy Planning! 🎮🏭**
