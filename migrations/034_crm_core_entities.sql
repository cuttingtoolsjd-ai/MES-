-- 034_crm_core_entities.sql
-- Core CRM entities: assignments (many-to-many), opportunities, quotations, activities, chat, push subscriptions

-- Customer assignments (many-to-many). Keep assigned_sales_user_id in customers as owner; this allows multiple assignees too
CREATE TABLE IF NOT EXISTS customer_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_customer_assignments_customer ON customer_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_assignments_user ON customer_assignments(user_id);

-- Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Qualification',
  value NUMERIC(12,2) DEFAULT 0,
  close_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);

-- Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

-- Activities (notes/tasks/call/meeting/email)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'Note',
  content TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activities_customer ON activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);

-- Chat messages (org-wide or contextual)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT NOT NULL, -- 'global' or 'customer:<id>'
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_time ON chat_messages(room_id, created_at DESC);

-- Push subscriptions for Web Push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
