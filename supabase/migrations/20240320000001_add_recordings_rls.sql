-- Enable RLS on recordings table
alter table recordings enable row level security;

-- Create policy for inserting recordings
create policy "Users can insert their own recordings"
on recordings for insert
to authenticated
with check (auth.uid() = user_id);

-- Create policy for viewing recordings
create policy "Users can view their own recordings"
on recordings for select
to authenticated
using (auth.uid() = user_id);

-- Create policy for updating recordings
create policy "Users can update their own recordings"
on recordings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Create policy for deleting recordings
create policy "Users can delete their own recordings"
on recordings for delete
to authenticated
using (auth.uid() = user_id); 