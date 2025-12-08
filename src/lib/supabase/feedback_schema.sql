-- Create Feedback Table
create table public.feedback (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null, -- Links to Supabase Auth User
  user_email text, -- Store email for quick reference (optional, can be joined)
  
  -- Feedback Content
  category text not null check (category in ('bus_missing', 'wrong_stop', 'app_bug', 'other')),
  content text not null,
  
  -- Context (Optional)
  stop_id uuid references public.stops(id),
  route_id uuid references public.routes(id),
  
  -- Status
  status text default 'pending' check (status in ('pending', 'reviewed', 'resolved')),
  admin_comment text
);

-- Enable Row Level Security
alter table public.feedback enable row level security;

-- Policy: Anyone logged in can insert (create) feedback
create policy "Users can insert their own feedback"
on public.feedback for insert
to authenticated
with check (auth.uid() = user_id);

-- Policy: Users can see their own feedback
create policy "Users can view their own feedback"
on public.feedback for select
to authenticated
using (auth.uid() = user_id);

-- Policy: Admins can see/update all feedback
-- (Assuming you have an admin role or specific email check. 
--  For now, allowing full access to a specific admin email or service role)
--  Adjust this policy based on your actual admin auth strategy.
--  Here is a generic one that assumes a metadata field 'is_admin' or similar, 
--  but for simplicity in this project, we might handling admin check in the app logic 
--  or via the Supabase Dashboard. 
--  Let's add a policy for a specific hardcoded admin email for now as a safeguard
--  OR relying on Service Role for Admin Pages.

-- Allow read access to everyone for now if it's open, but usually feedback is private.
-- Sticking to "Own Data" policy above.
