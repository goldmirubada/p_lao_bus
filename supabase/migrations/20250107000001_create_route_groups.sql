-- Create route_groups table
CREATE TABLE route_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE route_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_groups_select_policy" ON route_groups
  FOR SELECT USING (true);

CREATE POLICY "route_groups_modify_policy" ON route_groups
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert default groups
INSERT INTO route_groups (name, sort_order) VALUES
('시내버스', 10),
('공항버스', 20),
('시외버스', 30),
('마을버스', 40),
('기타', 99);

-- Add group_id to routes table
ALTER TABLE routes 
ADD COLUMN group_id UUID REFERENCES route_groups(id);

-- Migrate existing data
UPDATE routes
SET group_id = (SELECT id FROM route_groups WHERE name = routes.route_type)
WHERE route_type IS NOT NULL;

-- If any routes have a route_type that doesn't match, set them to '기타' or leave null?
-- Let's set them to '기타' if group_id is still null
UPDATE routes
SET group_id = (SELECT id FROM route_groups WHERE name = '기타')
WHERE group_id IS NULL;
