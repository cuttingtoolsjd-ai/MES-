-- Stock Items Table for Korv Factory App
create table if not exists stock_items (
  id uuid primary key default uuid_generate_v4(),
  item_name text,
  item_code text unique,
  category text,
  unit text,
  quantity numeric,
  min_required numeric,
  unit_cost numeric,
  location text,
  notes text,
  last_updated timestamp default now()
);
