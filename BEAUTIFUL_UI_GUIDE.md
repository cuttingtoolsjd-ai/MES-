# 🎨 Premium UI Components Library

A comprehensive, modern UI component library for the JD Cutting Tools Factory Management System. Built with **React**, **Tailwind CSS**, **Framer Motion**, and following SaaS design patterns (Slack, Linear, Intercom, Notion).

---

## 📦 Components Overview

### 1. **PremiumChatBox** (`components/PremiumChatBox.js`)

Beautiful SaaS-style chat interface with professional animations and multiple room support.

#### Features:
- ✅ **Floating Dock** - Minimizable chat widget (bottom-right corner)
- ✅ **Room Selector** - Global, Customer, Direct Messages, Teams
- ✅ **Direct Messaging** - Private 1-on-1 conversations
- ✅ **Team Creation** - Multi-user group chats with localStorage persistence
- ✅ **Message Polling** - Real-time-ish polling (3s interval)
- ✅ **Optimistic Sends** - Instant message feedback with rollback on error
- ✅ **Smooth Animations** - Framer Motion for transitions
- ✅ **Dark/Light Theme** - Full Tailwind dark mode support

#### Usage:
```jsx
import PremiumChatBox from '@/components/PremiumChatBox'

export default function Page({ user }) {
  return (
    <>
      {/* Your page content */}
      <PremiumChatBox 
        user={user} 
        customerContextId={customerId}  // Optional
      />
    </>
  )
}
```

#### Props:
- `user` (Object, required) - User object with `id` and `username`
- `customerContextId` (String, optional) - Pre-selected customer room

---

### 2. **ChatHistoryTable** (`components/ChatHistoryTable.js`)

Professional table component for viewing and searching message history.

#### Features:
- ✅ **Searchable Table** - Full-text search across messages and senders
- ✅ **Room Badges** - Color-coded room types (global, DM, team, customer)
- ✅ **Message Modal** - Expanded view of full message content
- ✅ **Responsive Design** - Works on mobile, tablet, and desktop
- ✅ **Dark Mode** - Native dark mode support
- ✅ **Loading States** - Skeleton loaders during fetch
- ✅ **Animations** - Smooth row animations on load

#### Usage:
```jsx
import ChatHistoryTable from '@/components/ChatHistoryTable'

export default function Page({ user }) {
  return (
    <ChatHistoryTable 
      userId={user.id}
      roomFilter="global"  // Optional filter
    />
  )
}
```

#### Props:
- `userId` (String, required) - Current user ID
- `roomFilter` (String, optional) - Filter by room_id

---

### 3. **UIComponents Library** (`components/UIComponents.js`)

Comprehensive set of 20+ reusable components for building beautiful interfaces.

#### **Cards**

```jsx
import { Card, GlassCard, GradientCard } from '@/components/UIComponents'

// Regular Card
<Card className="p-6">
  <h3>Card Title</h3>
  <p>Card content here</p>
</Card>

// Glass Card (glassmorphism effect)
<GlassCard className="p-6">
  <h3>Glass Effect</h3>
</GlassCard>

// Gradient Card
<GradientCard gradient="from-indigo-600 to-purple-600">
  <h3 className="text-white">Gradient</h3>
</GradientCard>
```

#### **Buttons**

```jsx
import { Button, IconButton } from '@/components/UIComponents'

// Button variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button variant="success">Success</Button>

// Button sizes
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

// Button states
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>

// Icon Button
<IconButton icon={SendIcon} onClick={handleSend} />
```

#### **Badges & Status**

```jsx
import { Badge, StatusBadge } from '@/components/UIComponents'

// Badges
<Badge variant="primary" icon="🎯">Primary Badge</Badge>
<Badge variant="success" icon="✅">Success</Badge>
<Badge variant="warning" icon="⚠️">Warning</Badge>
<Badge variant="danger" icon="❌">Danger</Badge>

// Status Badges
<StatusBadge status="active" />      {/* 🟢 Active */}
<StatusBadge status="inactive" />    {/* ⚫ Inactive */}
<StatusBadge status="pending" />     {/* 🟡 Pending */}
<StatusBadge status="completed" />   {/* ✅ Completed */}
<StatusBadge status="failed" />      {/* ❌ Failed */}
<StatusBadge status="paused" />      {/* ⏸️ Paused */}
```

#### **Avatars**

```jsx
import { Avatar } from '@/components/UIComponents'

// Initials-based avatar
<Avatar initials="AJ" size="md" />

// Avatar with status
<Avatar initials="BS" size="lg" status="online" />
<Avatar initials="CW" size="lg" status="away" />
<Avatar initials="DJ" size="lg" status="offline" />

// Avatar sizes
<Avatar size="xs" initials="AJ" />
<Avatar size="sm" initials="BS" />
<Avatar size="md" initials="CW" />
<Avatar size="lg" initials="DJ" />
<Avatar size="xl" initials="EK" />

// Avatar with image
<Avatar src="/path/to/avatar.jpg" alt="John" size="md" />

// Avatar group
<div className="flex -space-x-2">
  <Avatar initials="A" className="ring-2 ring-white" />
  <Avatar initials="B" className="ring-2 ring-white" />
  <Avatar initials="C" className="ring-2 ring-white" />
</div>
```

#### **Form Inputs**

```jsx
import { TextInput, TextArea } from '@/components/UIComponents'

// Text Input
<TextInput
  label="Email"
  placeholder="you@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  helpText="We'll never share your email"
/>

// Input with icon
<TextInput
  label="Search"
  icon={<SearchIcon />}
  placeholder="Search messages..."
/>

// Input with error
<TextInput
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
/>

// Disabled input
<TextInput
  label="Read Only"
  disabled
  value="Cannot edit this"
/>

// TextArea
<TextArea
  label="Description"
  placeholder="Enter description..."
  rows={4}
  value={description}
  onChange={(e) => setDescription(e.target.value)}
/>
```

#### **Modals & Dialogs**

```jsx
import { Modal, Button } from '@/components/UIComponents'
import { useState } from 'react'

const [isOpen, setIsOpen] = useState(false)

<Button onClick={() => setIsOpen(true)}>Open Modal</Button>

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  isDanger={false}
  size="md"
  actions={
    <>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleConfirm}>
        Confirm
      </Button>
    </>
  }
>
  <p>Are you sure you want to proceed?</p>
</Modal>
```

#### **Alerts & Notifications**

```jsx
import { Alert } from '@/components/UIComponents'

<Alert
  type="info"
  title="Information"
  message="This is an informational alert"
  dismissible
  onClose={() => setAlert(null)}
/>

<Alert
  type="success"
  title="Success"
  message="Operation completed successfully"
/>

<Alert
  type="warning"
  title="Warning"
  message="Please review before proceeding"
/>

<Alert
  type="error"
  title="Error"
  message="Something went wrong"
/>
```

#### **Skeleton Loaders**

```jsx
import { SkeletonLoader } from '@/components/UIComponents'

// Loading placeholder
{isLoading ? (
  <SkeletonLoader count={3} lines={4} />
) : (
  <YourContent />
)}
```

#### **Typography & Spacing**

```jsx
import { SectionTitle, Divider } from '@/components/UIComponents'

<SectionTitle 
  title="Section Title" 
  subtitle="Optional subtitle"
  className="mb-6"
/>

<Divider className="my-8" />
```

---

## 🎨 Design System

### Color Palette

**Gradients:**
- `from-indigo-600 to-purple-600` - Primary (main actions)
- `from-purple-600 to-pink-600` - Secondary (highlights)
- `from-slate-50 to-slate-100` - Light backgrounds

**Semantic Colors:**
- Success: `from-green-100 to-green-50` / `text-green-700`
- Warning: `from-yellow-100 to-yellow-50` / `text-yellow-700`
- Error: `from-red-100 to-red-50` / `text-red-700`
- Info: `from-blue-100 to-blue-50` / `text-blue-700`

### Typography

- **Headings:** `font-bold` with `tracking-tight`
- **Body:** `text-sm` or `text-base` with `leading-relaxed`
- **Buttons:** `font-semibold` with uppercase status indicators
- **Labels:** `text-xs font-bold uppercase tracking-wider`

### Spacing

- **Cards:** `px-6 py-4` or `p-6`
- **Buttons:** `px-4 py-2` (md) with size variants
- **Gaps:** `gap-3`, `gap-4`, `gap-6` depending on context
- **Dividers:** `my-6`, `my-8` around sections

### Rounded Corners

- **Cards/Modals:** `rounded-2xl`
- **Buttons:** `rounded-lg` (buttons), `rounded-full` (pill buttons)
- **Inputs:** `rounded-lg`
- **Badges:** `rounded-full`

---

## 🎬 Animations with Framer Motion

All components use **Framer Motion** for smooth, professional animations:

- **Buttons:** `whileHover={{ scale: 1.02 }}` + `whileTap={{ scale: 0.98 }}`
- **Cards:** `whileHover={{ y: -2 }}` (subtle lift effect)
- **Modals:** `initial={{ scale: 0.95, opacity: 0 }}` → `animate={{ scale: 1, opacity: 1 }}`
- **Messages:** `initial={{ opacity: 0, y: 10 }}` → `animate={{ opacity: 1, y: 0 }}`
- **Lists:** Staggered animations with `transition={{ delay: index * 0.1 }}`

---

## 🌙 Dark Mode Support

All components support Tailwind's dark mode:

```jsx
// Automatically applies dark mode classes
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
  Content
</div>
```

Enable in `tailwind.config.js`:
```js
darkMode: 'class'
```

Toggle dark mode by adding/removing `dark` class on `<html>` element.

---

## 🚀 Integration Guide

### 1. Import Components

```jsx
import PremiumChatBox from '@/components/PremiumChatBox'
import ChatHistoryTable from '@/components/ChatHistoryTable'
import {
  Card,
  Button,
  Badge,
  Avatar,
  TextInput,
  Alert,
  Modal,
} from '@/components/UIComponents'
```

### 2. Use DashboardLayout

The `DashboardLayout` component automatically includes `PremiumChatBox`:

```jsx
import DashboardLayout from '@/components/DashboardLayout'

export default function AdminPage({ user }) {
  return (
    <DashboardLayout
      user={user}
      title="Admin Dashboard"
      subtitle="Manage your factory operations"
      onLogoClick={() => router.push('/dashboard')}
      rightContent={<Badge variant="primary">Admin</Badge>}
    >
      {/* Your dashboard content here */}
    </DashboardLayout>
  )
}
```

### 3. Build Beautiful Dashboards

```jsx
import { Card, Button, Avatar, Badge } from '@/components/UIComponents'

export default function EmployeeCard({ employee }) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <Avatar initials={employee.name.split(' ').map(n => n[0]).join('')} />
        <Badge variant="success">Active</Badge>
      </div>
      
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
        {employee.name}
      </h3>
      
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {employee.role}
      </p>
      
      <div className="flex gap-2">
        <Button variant="primary" size="sm">Edit</Button>
        <Button variant="ghost" size="sm">Delete</Button>
      </div>
    </Card>
  )
}
```

---

## 📱 Responsive Design

All components are fully responsive with Tailwind breakpoints:

- **sm**: 640px and up
- **md**: 768px and up
- **lg**: 1024px and up
- **xl**: 1280px and up

Example:
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id}>{item.name}</Card>)}
</div>
```

---

## 🧪 Demo Page

Visit the **UI Component Showcase** page to see all components in action:

```
/ui-showcase
```

This page demonstrates:
- All card variants
- Button states and sizes
- Badge and status indicators
- Avatar groups
- Form inputs
- Modal dialogs
- Chat history table
- Real-world usage patterns

---

## 🔧 Dependencies

- **React 18.3+**
- **Next.js 14.2+**
- **Tailwind CSS 4.1+**
- **Framer Motion 12.23+**
- **Supabase JS Client 2.75+**

All dependencies are already installed in `package.json`.

---

## 💡 Best Practices

1. **Consistent Spacing** - Use `gap-3`, `gap-4`, `gap-6` for consistent spacing
2. **Color Consistency** - Stick to the primary gradient (`indigo-600 to-purple-600`) for main actions
3. **Typography Hierarchy** - Use `font-bold` for titles, `font-semibold` for buttons, `text-sm` for body
4. **Dark Mode** - Always include dark variants using `dark:` prefix
5. **Accessibility** - Use semantic HTML, proper labels, and focus states
6. **Animation Restraint** - Keep animations subtle (200-300ms duration)
7. **Mobile First** - Design mobile layouts first, then enhance for larger screens

---

## 📝 License

Part of the JD Cutting Tools Factory Management System.

---

## 🎉 Ready to Build Beautiful Interfaces!

Start using these components to create stunning, professional UIs that rival modern SaaS applications like Slack, Linear, Notion, and Intercom.

**Happy building! ✨**
