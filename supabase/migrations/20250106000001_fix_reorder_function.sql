-- Function to reorder route stops safely using route_stop_id (PK)
-- This handles cases where the same stop appears multiple times or in different directions
DROP FUNCTION IF EXISTS reorder_route_stops(uuid, uuid[]);

CREATE OR REPLACE FUNCTION reorder_route_stops(
    p_route_id uuid,
    p_route_stop_ids uuid[] -- Array of route_stops.id (Primary Key)
)
RETURNS void AS $$
DECLARE
    v_route_stop_id uuid;
    v_index int;
BEGIN
    -- 1. Temporarily set sequence_order to a large negative value to avoid conflicts
    v_index := 1;
    FOREACH v_route_stop_id IN ARRAY p_route_stop_ids
    LOOP
        UPDATE route_stops 
        SET sequence_order = -(1000 + v_index)
        WHERE id = v_route_stop_id; -- Update by Primary Key
        v_index := v_index + 1;
    END LOOP;
    
    -- 2. Set the correct sequence_order
    v_index := 1;
    FOREACH v_route_stop_id IN ARRAY p_route_stop_ids
    LOOP
        UPDATE route_stops 
        SET sequence_order = v_index 
        WHERE id = v_route_stop_id; -- Update by Primary Key
        v_index := v_index + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
