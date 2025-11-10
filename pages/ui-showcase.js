import React, { useState } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/DashboardLayout'
import ChatHistoryTable from '../components/ChatHistoryTable'
import {
  Card,
  GlassCard,
  GradientCard,
  Button,
  Badge,
  StatusBadge,
  Avatar,
  TextInput,
  Alert,
  Modal,
  Divider,
  SectionTitle,
} from '../components/UIComponents'

// Demo Icons
const StarIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
)

const HeartIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
  </svg>
)

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

// Demo Card Section Component
function DemoSection({ title, description, children }) {
  return (
    <div>
      <SectionTitle title={title} subtitle={description} className="mb-6" />
      <div className="space-y-4">{children}</div>
    </div>
  )
}

// Main UI Component Showcase Page
export default function UIComponentShowcase({ user }) {
  const [showModal, setShowModal] = useState(false)
  const [alertMessage, setAlertMessage] = useState(null)
  const [textInputValue, setTextInputValue] = useState('')
  const [selectedBadge, setSelectedBadge] = useState('primary')

  const handleLogoClick = () => {
    setAlertMessage({
      type: 'info',
      title: 'Welcome!',
      message: 'You clicked the logo. This is a demo of the beautiful UI components.',
    })
  }

  // Sample data for demo
  const sampleUsers = [
    { id: 1, name: 'Alice Johnson', role: 'Manager', status: 'online' },
    { id: 2, name: 'Bob Smith', role: 'Operator', status: 'away' },
    { id: 3, name: 'Carol White', role: 'Admin', status: 'offline' },
  ]

  const sampleStats = [
    { icon: <ChartIcon />, label: 'Messages', value: '1,234', trend: '+12%' },
    { icon: <HeartIcon />, label: 'Engagement', value: '89%', trend: '+5%' },
    { icon: <StarIcon />, label: 'Rating', value: '4.8', trend: '+0.2' },
  ]

  return (
    <DashboardLayout
      user={user}
      title="✨ UI Components Showcase"
      subtitle="Beautiful, reusable components built with React, Tailwind CSS, and Framer Motion"
      onLogoClick={handleLogoClick}
      rightContent={
        <Badge variant="primary" icon="🚀">
          Premium UI
        </Badge>
      }
    >
      {/* Alert Demo */}
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          title={alertMessage.title}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
          dismissible
        />
      )}

      {/* Stats Section */}
      <DemoSection
        title="📊 Statistics Cards"
        description="Beautiful gradient cards displaying key metrics"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {sampleStats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <GradientCard className="px-6 py-8 text-center text-white">
                <div className="flex justify-center mb-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    {stat.icon}
                  </div>
                </div>
                <h3 className="text-sm font-medium opacity-90 mb-1">
                  {stat.label}
                </h3>
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm opacity-75 mt-2">
                  {stat.trend}
                  <span className="ml-1">▲</span>
                </p>
              </GradientCard>
            </motion.div>
          ))}
        </div>
      </DemoSection>

      <Divider className="my-8" />

      {/* Cards Section */}
      <DemoSection
        title="🎨 Card Variants"
        description="Different card styles for various use cases"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Normal Card */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Regular Card
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Standard card with hover effect and smooth shadow transition.
            </p>
            <Button variant="secondary" size="sm">
              Learn More
            </Button>
          </Card>

          {/* Glass Card */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Glass Card
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Glassmorphism effect with backdrop blur and transparency.
            </p>
            <Button variant="primary" size="sm">
              Explore
            </Button>
          </GlassCard>

          {/* Gradient Card */}
          <GradientCard gradient="from-purple-600 to-pink-600" className="px-6 py-8 text-center text-white">
            <h3 className="text-lg font-bold mb-2">Gradient Card</h3>
            <p className="text-sm opacity-90 mb-4">
              Vibrant gradient background with premium feel.
            </p>
            <Button className="w-full" size="sm">
              Discover
            </Button>
          </GradientCard>
        </div>
      </DemoSection>

      <Divider className="my-8" />

      {/* Buttons Section */}
      <DemoSection
        title="🔘 Button Variants"
        description="Multiple button styles, sizes, and states"
      >
        <div className="space-y-6">
          {/* Button Variants */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
              Variants
            </h4>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="success">Success</Button>
            </div>
          </div>

          {/* Button Sizes */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
              Sizes
            </h4>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
          </div>

          {/* Button States */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
              States
            </h4>
            <div className="flex flex-wrap gap-3">
              <Button>Normal</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
            </div>
          </div>
        </div>
      </DemoSection>

      <Divider className="my-8" />

      {/* Badges Section */}
      <DemoSection
        title="🏷️ Badges & Status"
        description="Color-coded badges and status indicators"
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
              Badge Variants
            </h4>
            <div className="flex flex-wrap gap-3">
              <Badge variant="default">Default</Badge>
              <Badge variant="primary" icon="🎯">
                Primary
              </Badge>
              <Badge variant="success" icon="✅">
                Success
              </Badge>
              <Badge variant="warning" icon="⚠️">
                Warning
              </Badge>
              <Badge variant="danger" icon="❌">
                Danger
              </Badge>
              <Badge variant="purple" icon="💜">
                Purple
              </Badge>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
              Status Badges
            </h4>
            <div className="flex flex-wrap gap-3">
              <StatusBadge status="active" />
              <StatusBadge status="inactive" />
              <StatusBadge status="pending" />
              <StatusBadge status="completed" />
              <StatusBadge status="failed" />
              <StatusBadge status="paused" />
            </div>
          </div>
        </div>
      </DemoSection>

      <Divider className="my-8" />

      {/* Avatars Section */}
      <DemoSection
        title="👤 Avatars"
        description="User avatars with initials and online status"
      >
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
            Sizes & Status
          </h4>
          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex flex-col items-center gap-2">
              <Avatar size="xs" initials="AJ" />
              <span className="text-xs text-slate-500">XS</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar size="sm" initials="BS" />
              <span className="text-xs text-slate-500">SM</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar size="md" initials="CW" status="online" />
              <span className="text-xs text-slate-500">Online</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar size="lg" initials="DJ" status="away" />
              <span className="text-xs text-slate-500">Away</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar size="xl" initials="EK" status="offline" />
              <span className="text-xs text-slate-500">Offline</span>
            </div>
          </div>

          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-6 mb-3 uppercase tracking-wider">
            Avatar Group
          </h4>
          <div className="flex -space-x-2">
            {sampleUsers.map((user, idx) => (
              <Avatar
                key={user.id}
                initials={user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
                title={user.name}
                status={user.status}
                size="lg"
                className="ring-2 ring-white dark:ring-slate-900"
              />
            ))}
          </div>
        </div>
      </DemoSection>

      <Divider className="my-8" />

      {/* Form Inputs Section */}
      <DemoSection
        title="📝 Form Inputs"
        description="Text inputs, textareas, and form elements"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TextInput
            label="Full Name"
            placeholder="Enter your full name"
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            helpText="This is a regular text input with validation"
          />

          <TextInput
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            icon={<span>📧</span>}
            helpText="We'll never share your email"
          />

          <TextInput
            label="Password"
            type="password"
            placeholder="••••••••"
            error="Password must be at least 8 characters"
          />

          <TextInput
            label="Disabled Input"
            placeholder="This is disabled"
            disabled
            value="Read-only field"
          />
        </div>
      </DemoSection>

      <Divider className="my-8" />

      {/* Modal Demo */}
      <DemoSection
        title="💬 Modals & Dialogs"
        description="Interactive modal windows for user interactions"
      >
        <Button variant="primary" onClick={() => setShowModal(true)}>
          Open Modal
        </Button>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Welcome to Our App"
          actions={
            <>
              <Button
                variant="ghost"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowModal(false)
                  setAlertMessage({
                    type: 'success',
                    title: 'Success!',
                    message: 'Modal action completed successfully.',
                  })
                }}
              >
                Confirm
              </Button>
            </>
          }
        >
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            This is a sample modal dialog. You can use it to display important
            information, confirmations, or form content.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Modals are perfect for getting user attention and forcing an action.
          </p>
        </Modal>
      </DemoSection>

      <Divider className="my-8" />

      {/* Chat History Table */}
      <DemoSection
        title="💬 Chat History"
        description="Professional table component for viewing message history"
      >
        <ChatHistoryTable userId={user?.id} />
      </DemoSection>

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          All components built with React, Tailwind CSS, and Framer Motion
        </p>
        <p className="text-slate-500 dark:text-slate-500 text-xs mt-2">
          Ready to integrate into your dashboard pages
        </p>
      </div>
    </DashboardLayout>
  )
}
