-- Add route_type column to routes table
ALTER TABLE routes 
ADD COLUMN route_type TEXT NOT NULL DEFAULT '일반';

-- Update existing routes to have a default type if needed (already handled by DEFAULT)
-- But let's make sure we have a comment or check constraint if we wanted fixed types, 
-- but for flexibility we'll keep it as TEXT.
