-- 모든 정류장과 좌표를 한 번에 반환하는 함수
-- Create a function to return all stops with their coordinates
create or replace function get_stops_with_coordinates()
returns table (
  id uuid,
  stop_name text,
  stop_name_en text,
  image_url text,
  description text,
  lat double precision,
  lng double precision
)
language plpgsql
as $$
begin
  return query
  select
    s.id,
    s.stop_name,
    s.stop_name_en,
    s.image_url,
    s.description,
    st_y(s.location::geometry) as lat,
    st_x(s.location::geometry) as lng
  from stops s
  order by s.created_at desc;
end;
$$;
