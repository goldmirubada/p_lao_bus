-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Routes Table
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_number TEXT NOT NULL UNIQUE,
  route_name TEXT NOT NULL,
  route_color TEXT NOT NULL DEFAULT '#3B82F6',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routes_select_policy" ON routes
  FOR SELECT USING (true);

CREATE POLICY "routes_modify_policy" ON routes
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Stops Table
CREATE TABLE stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_name TEXT NOT NULL,
  stop_name_en TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  schematic_x NUMERIC(10, 2),
  schematic_y NUMERIC(10, 2),
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX stops_location_idx ON stops USING GIST(location);

ALTER TABLE stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stops_select_policy" ON stops
  FOR SELECT USING (true);

CREATE POLICY "stops_modify_policy" ON stops
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Route Stops Association Table
CREATE TABLE route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  stop_id UUID REFERENCES stops(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  direction TEXT DEFAULT 'outbound',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(route_id, sequence_order, direction)
);

ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_stops_select_policy" ON route_stops
  FOR SELECT USING (true);

CREATE POLICY "route_stops_modify_policy" ON route_stops
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Schematic Settings Table
CREATE TABLE schematic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_width INTEGER DEFAULT 1920,
  canvas_height INTEGER DEFAULT 1080,
  zoom_level NUMERIC(5, 2) DEFAULT 1.0,
  center_x NUMERIC(10, 2) DEFAULT 0,
  center_y NUMERIC(10, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO schematic_settings DEFAULT VALUES;

ALTER TABLE schematic_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schematic_settings_select_policy" ON schematic_settings
  FOR SELECT USING (true);

CREATE POLICY "schematic_settings_modify_policy" ON schematic_settings
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER stops_updated_at
  BEFORE UPDATE ON stops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to get lat/lng from geography
CREATE OR REPLACE FUNCTION get_stop_coordinates(stop_id UUID)
RETURNS TABLE(lat FLOAT, lng FLOAT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_Y(location::geometry) as lat,
    ST_X(location::geometry) as lng
  FROM stops
  WHERE id = stop_id;
END;
$$ LANGUAGE plpgsql;
