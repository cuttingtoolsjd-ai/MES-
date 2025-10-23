-- Machine settings: max korv capacity and maintenance flag per machine
CREATE TABLE IF NOT EXISTS machine_settings (
  machine_id text PRIMARY KEY,
  max_korv integer NOT NULL DEFAULT 100,
  maintenance boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

CREATE INDEX IF NOT EXISTS machine_settings_maintenance_idx ON machine_settings(maintenance);
