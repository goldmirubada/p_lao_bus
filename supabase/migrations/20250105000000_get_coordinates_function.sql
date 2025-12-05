-- Function to extract coordinates from PostGIS geography as GeoJSON
CREATE OR REPLACE FUNCTION get_stop_coordinates(stop_id uuid)
RETURNS TABLE(lat float8, lng float8) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_Y(location::geometry) as lat,
    ST_X(location::geometry) as lng
  FROM stops
  WHERE id = stop_id;
END;
$$ LANGUAGE plpgsql;
