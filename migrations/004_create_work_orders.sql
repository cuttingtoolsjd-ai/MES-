-- Work Orders Table for Korv Factory App
create table if not exists work_orders (
  id uuid primary key default uuid_generate_v4(),
  work_order_no text,
  drawing_no text,
  customer_name text,
  po_number text,
  tool_code text,
  tool_description text,
  quantity numeric,
  price_per_unit numeric,
  total_price numeric,
  machine text,
  complexity integer,
  cycle_time numeric,
  korv_per_unit numeric,
  total_korv numeric,
  status text default 'Created',
  assigned_to text,
  created_by text,
  created_on timestamp default now()
);
