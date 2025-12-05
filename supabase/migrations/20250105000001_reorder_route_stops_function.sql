-- Function to reorder route stops safely
CREATE OR REPLACE FUNCTION reorder_route_stops(
    p_route_id uuid,
    p_stop_ids uuid[]
)
RETURNS void AS $$
DECLARE
    v_stop_id uuid;
    v_index int := 1;
BEGIN
    -- Set all sequence_orders to negative temporarily to avoid conflicts
    UPDATE route_stops 
    SET sequence_order = -sequence_order 
    WHERE route_id = p_route_id;
    
    -- Update each stop with new sequence order
    FOREACH v_stop_id IN ARRAY p_stop_ids
    LOOP
        UPDATE route_stops 
        SET sequence_order = v_index 
        WHERE route_id = p_route_id AND stop_id = v_stop_id;
        
        v_index := v_index + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
