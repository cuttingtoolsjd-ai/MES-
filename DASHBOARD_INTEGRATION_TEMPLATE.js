/**
 * INTEGRATION TEMPLATE
 * 
 * This file demonstrates how to integrate the beautiful UI components
 * into your existing dashboard pages (admin, manager, operator).
 * 
 * Copy this pattern and apply it to:
 * - pages/admin.js
 * - pages/manager.js
 * - pages/operator.js
 */

import React, { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import ChatHistoryTable from '../components/ChatHistoryTable'
import {
  Card,
  GradientCard,
  Button,
  Badge,
  Avatar,
  TextInput,
  Alert,
  SkeletonLoader,
  SectionTitle,
  Divider,
} from '../components/UIComponents'

export default function DashboardTemplate({ user }) {
  const [showAlert, setShowAlert] = useState(false)

  return (
    <DashboardLayout
      user={user}
      title="📊 Dashboard Title"
      subtitle="Your dashboard description here"
      onLogoClick={() => console.log('Logo clicked')}
      rightContent={
        <Badge variant="primary" icon="⚡">
          Admin
        </Badge>
      }
    >
      {/* ============================================================================
          SECTION 1: KEY METRICS
          ============================================================================ */}
      
      <div>
        <SectionTitle 
          title="📈 Key Metrics" 
          subtitle="Today's performance snapshot"
          className="mb-6"
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric Card 1 */}
          <GradientCard 
            gradient="from-blue-600 to-blue-700"
            className="px-6 py-8 text-center text-white"
          >
            <div className="text-4xl font-bold mb-2">1,234</div>
            <div className="text-blue-100 text-sm font-medium">Total Orders</div>
            <div className="text-blue-200 text-xs mt-2">↑ 12% from yesterday</div>
          </GradientCard>

          {/* Metric Card 2 */}
          <GradientCard 
            gradient="from-green-600 to-green-700"
            className="px-6 py-8 text-center text-white"
          >
            <div className="text-4xl font-bold mb-2">89%</div>
            <div className="text-green-100 text-sm font-medium">Completion</div>
            <div className="text-green-200 text-xs mt-2">↑ 5% from last week</div>
          </GradientCard>

          {/* Metric Card 3 */}
          <GradientCard 
            gradient="from-purple-600 to-purple-700"
            className="px-6 py-8 text-center text-white"
          >
            <div className="text-4xl font-bold mb-2">23</div>
            <div className="text-purple-100 text-sm font-medium">Active Users</div>
            <div className="text-purple-200 text-xs mt-2">↑ 3 new today</div>
          </GradientCard>

          {/* Metric Card 4 */}
          <GradientCard 
            gradient="from-orange-600 to-orange-700"
            className="px-6 py-8 text-center text-white"
          >
            <div className="text-4xl font-bold mb-2">4.8</div>
            <div className="text-orange-100 text-sm font-medium">Avg Rating</div>
            <div className="text-orange-200 text-xs mt-2">↑ 0.2 from last month</div>
          </GradientCard>
        </div>
      </div>

      <Divider className="my-8" />

      {/* ============================================================================
          SECTION 2: ALERTS & STATUS
          ============================================================================ */}
      
      {showAlert && (
        <Alert
          type="info"
          title="Welcome Back!"
          message="You have 3 new messages and 2 pending reviews."
          onClose={() => setShowAlert(false)}
          dismissible
        />
      )}

      {/* ============================================================================
          SECTION 3: INTERACTIVE CARDS WITH BUTTONS
          ============================================================================ */}
      
      <div>
        <SectionTitle 
          title="🎯 Action Items" 
          subtitle="Things that need your attention"
          className="mb-6"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1 */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Pending Reviews
              </h3>
              <Badge variant="warning" icon="⏳">5 items</Badge>
            </div>
            
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Review and approve the following work orders.
            </p>
            
            <div className="flex gap-2">
              <Button variant="primary" size="sm">View All</Button>
              <Button variant="ghost" size="sm">Dismiss</Button>
            </div>
          </Card>

          {/* Card 2 */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Team Performance
              </h3>
              <Badge variant="success" icon="✅">On Track</Badge>
            </div>
            
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Your team is exceeding targets this month. Great work!
            </p>
            
            <Button variant="primary" size="sm">View Details</Button>
          </Card>
        </div>
      </div>

      <Divider className="my-8" />

      {/* ============================================================================
          SECTION 4: EMPLOYEE/USER LIST WITH AVATARS
          ============================================================================ */}
      
      <div>
        <SectionTitle 
          title="👥 Team Members" 
          subtitle="Your current team"
          className="mb-6"
        />
        
        <Card className="p-6">
          <div className="space-y-4">
            {/* Team Member 1 */}
            <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <div className="flex items-center gap-4">
                <Avatar initials="AJ" status="online" size="md" />
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    Alice Johnson
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Production Manager
                  </p>
                </div>
              </div>
              <Badge variant="success">Active</Badge>
            </div>

            {/* Team Member 2 */}
            <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <div className="flex items-center gap-4">
                <Avatar initials="BS" status="away" size="md" />
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    Bob Smith
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Operator
                  </p>
                </div>
              </div>
              <Badge variant="warning">Away</Badge>
            </div>

            {/* Team Member 3 */}
            <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <div className="flex items-center gap-4">
                <Avatar initials="CW" status="offline" size="md" />
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    Carol White
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Quality Inspector
                  </p>
                </div>
              </div>
              <Badge variant="default">Offline</Badge>
            </div>
          </div>
        </Card>
      </div>

      <Divider className="my-8" />

      {/* ============================================================================
          SECTION 5: SEARCH & FILTER EXAMPLE
          ============================================================================ */}
      
      <div>
        <SectionTitle 
          title="🔍 Search & Filter" 
          subtitle="Find what you need"
          className="mb-6"
        />
        
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <TextInput
              label="Search"
              placeholder="Search by name or ID..."
              icon={<span>🔍</span>}
            />
            
            <TextInput
              label="Date Range"
              type="date"
            />
            
            <TextInput
              label="Status"
              placeholder="Filter by status..."
            />
          </div>
          
          <Button variant="primary">Apply Filters</Button>
        </Card>
      </div>

      <Divider className="my-8" />

      {/* ============================================================================
          SECTION 6: CHAT HISTORY TABLE
          ============================================================================ */}
      
      <ChatHistoryTable userId={user?.id} />

      {/* ============================================================================
          NOTE: PremiumChatBox is automatically injected by DashboardLayout!
          ============================================================================ */}
    </DashboardLayout>
  )
}

/**
 * STYLING GUIDELINES
 * 
 * 1. SPACING
 *    - Section gaps: Divider className="my-8"
 *    - Card internal: px-6 py-6 or p-6
 *    - Component gaps: gap-4
 * 
 * 2. COLORS
 *    - Primary action: variant="primary" (indigo-to-purple gradient)
 *    - Secondary: variant="secondary" 
 *    - Accent badges: variant="primary", "success", "warning", "danger"
 * 
 * 3. TYPOGRAPHY
 *    - Section titles: Use SectionTitle component
 *    - Card titles: font-bold text-lg
 *    - Body text: text-sm with text-slate-600 dark:text-slate-400
 * 
 * 4. RESPONSIVE
 *    - Grid: grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
 *    - Always include mobile-first (grid-cols-1)
 * 
 * 5. DARK MODE
 *    - Always use dark: variants for text and backgrounds
 *    - Light: dark:text-white, dark:bg-slate-900
 * 
 * 6. ANIMATIONS
 *    - All components include Framer Motion animations
 *    - Cards have hover lift effect (y: -2)
 *    - Buttons have scale animation
 * 
 * EXAMPLE APPLY TO EXISTING PAGES:
 * 
 *   // Before
 *   <div className="p-4 bg-white rounded shadow">
 *     <h2>Title</h2>
 *   </div>
 *   
 *   // After
 *   <Card className="p-6">
 *     <SectionTitle title="Title" />
 *   </Card>
 */
