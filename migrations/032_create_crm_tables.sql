-- 032_create_crm_tables.sql
-- Customers, customer activity logs, enquiries workflow, purchase orders with auto-work-order intent.
-- Run this after existing migrations. Adjust types if needed for your Supabase PG instance.

-- Customers table: basic company/customer data & assignment
CREATE TABLE IF NOT EXISTS customers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  industry TEXT,
  country TEXT,
  city TEXT,
  address TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  assigned_sales_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  last_order_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_assigned_sales ON customers(assigned_sales_user_id);
CREATE INDEX IF NOT EXISTS idx_customers_last_order_date ON customers(last_order_date);

-- Customer inactivity / performance alerts log
CREATE TABLE IF NOT EXISTS customer_inactivity_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  detected_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  days_since_last_order INT NOT NULL,
  sales_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason_logged TEXT, -- optional manual reason
  resolved BOOLEAN DEFAULT FALSE,
  resolved_on TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_inactivity_customer ON customer_inactivity_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_inactivity_resolved ON customer_inactivity_logs(resolved);

-- Enquiries from Marketing; can request help from Sales (quotation) & Tech (geometry)
CREATE TABLE IF NOT EXISTS enquiries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  enquiry_ref TEXT UNIQUE,
  title TEXT NOT NULL,
  details TEXT,
  marketing_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open', -- open | awaiting-quotation | awaiting-geometry | closed
  need_sales_help BOOLEAN DEFAULT FALSE,
  need_tech_help BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_enquiries_customer ON enquiries(customer_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);

-- Enquiry assignments / responses log (sales or tech interactions)
CREATE TABLE IF NOT EXISTS enquiry_actions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  enquiry_id BIGINT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  role TEXT, -- 'sales' | 'tech' | 'marketing'
  action TEXT, -- 'quotation-provided' | 'geometry-provided' | 'closed' | 'note'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_enquiry_actions_enquiry ON enquiry_actions(enquiry_id);

-- Purchase Orders: high-level PO which can spawn one or many work orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_number TEXT UNIQUE NOT NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  total_price NUMERIC,
  total_korv NUMERIC,
  status TEXT DEFAULT 'created', -- created | in-progress | completed | cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_customer ON purchase_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- Purchase Order Lines -> to generate work orders (one line = one work_order)
CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  tool_code TEXT,
  tool_description TEXT,
  quantity INT NOT NULL,
  price NUMERIC,
  korv_per_unit NUMERIC,
  cnc_time NUMERIC,
  cylindrical_time NUMERIC,
  tc_time NUMERIC,
  coating_required TEXT, -- yes | no
  coating_type TEXT,
  marking TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_po_lines_po ON purchase_order_lines(purchase_order_id);

-- Trigger: when inserting a purchase_order_line, auto-create a work_order.
-- Work order number pattern: 'PO' || purchase_order_id || '-' || line_id
CREATE OR REPLACE FUNCTION create_work_order_from_po_line() RETURNS TRIGGER AS $$
DECLARE
  generated_wo_no TEXT;
BEGIN
  generated_wo_no := 'PO' || NEW.purchase_order_id || '-' || NEW.id;
  INSERT INTO work_orders (
    work_order_no, drawing_no, customer_name, po_number, tool_code, tool_description,
    quantity, price, korv_per_unit, total_korv, total_price, machine, status, assigned_to,
    created_by, coating_required, coating_type, marking
  ) VALUES (
    generated_wo_no,
    NULL,
    (SELECT name FROM customers WHERE id = (SELECT customer_id FROM purchase_orders WHERE id = NEW.purchase_order_id)),
    (SELECT po_number FROM purchase_orders WHERE id = NEW.purchase_order_id),
    NEW.tool_code,
    NEW.tool_description,
    NEW.quantity,
    NEW.price,
    NEW.korv_per_unit,
    CASE WHEN NEW.korv_per_unit IS NOT NULL THEN NEW.korv_per_unit * NEW.quantity ELSE NULL END,
    CASE WHEN NEW.price IS NOT NULL THEN NEW.price * NEW.quantity ELSE NULL END,
    NULL,
    'Created',
    NULL,
    (SELECT username FROM users WHERE id = (SELECT created_by FROM purchase_orders WHERE id = NEW.purchase_order_id)),
    NEW.coating_required,
    CASE WHEN NEW.coating_required = 'yes' THEN NEW.coating_type ELSE NULL END,
    NEW.marking
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_work_order_from_po_line ON purchase_order_lines;
CREATE TRIGGER trg_create_work_order_from_po_line
AFTER INSERT ON purchase_order_lines
FOR EACH ROW EXECUTE FUNCTION create_work_order_from_po_line();

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_enquiries_updated_at ON enquiries;
CREATE TRIGGER trg_enquiries_updated_at BEFORE UPDATE ON enquiries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
