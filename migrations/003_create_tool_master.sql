-- Tool Master Table for Korv Factory App
create table if not exists tool_master (
  id uuid primary key default uuid_generate_v4(),
  tool_code text unique,
  tool_description text,
  korv_per_unit numeric,
  created_at timestamp default now()
);
