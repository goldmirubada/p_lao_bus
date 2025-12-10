create or replace function get_route_stops_with_coords()
returns table (
  id uuid,
  route_id uuid,
  stop_id uuid,
  sequence_order integer,
  path_coordinates json,
  arrival_time time,
  departure_time time,
  is_major_stop boolean,
  created_at timestamptz,
  updated_at timestamptz,
  stop_data json -- We return the full stop object with lat/lng injected
)
language plpgsql
as $$
begin
  return query
  select
    rs.id,
    rs.route_id,
    rs.stop_id,
    rs.sequence_order,
    rs.path_coordinates,
    rs.arrival_time,
    rs.departure_time,
    rs.is_major_stop,
    rs.created_at,
    rs.updated_at,
    json_build_object(
      'id', s.id,
      'stop_name', s.stop_name,
      'stop_name_en', s.stop_name_en,
      'image_url', s.image_url,
      'lat', st_y(s.location::geometry),
      'lng', st_x(s.location::geometry),
      'location', s.location -- Include original just in case, but usually not needed if we have lat/lng
    ) as stop_data
  from route_stops rs
  join stops s on rs.stop_id = s.id
  order by rs.route_id, rs.sequence_order;
end;
$$;
