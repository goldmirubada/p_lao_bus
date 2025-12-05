-- Add path_coordinates column to route_stops table
ALTER TABLE route_stops 
ADD COLUMN path_coordinates JSONB DEFAULT '[]';

-- Comment on column
COMMENT ON COLUMN route_stops.path_coordinates IS 'Array of {lat, lng} objects representing the path to the next stop';
