-- Function to cleanup old logs based on days to keep
CREATE OR REPLACE FUNCTION public.cleanup_system_errors(days_to_keep int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
BEGIN
  -- Perform deletion
  DELETE FROM public.system_errors
  WHERE created_at < NOW() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Function to delete a single error log by ID
CREATE OR REPLACE FUNCTION public.delete_system_error(log_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.system_errors
  WHERE id = log_id;
END;
$$;

-- Grant execute permissions (Adjust based on your role setup, typically service_role or authenticated admin)
GRANT EXECUTE ON FUNCTION public.cleanup_system_errors(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_system_error(bigint) TO service_role;

-- If you have an 'admin' role, grant to that too.
-- GRANT EXECUTE ON FUNCTION public.cleanup_system_errors(int) TO authenticated;
