-- Create a new storage bucket for audio files
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false);

-- Allow users to upload their own recordings
create policy "Users can upload their own recordings"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'audio' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own recordings
create policy "Users can read their own recordings"
on storage.objects for select
to authenticated
using (
  bucket_id = 'audio' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own recordings
create policy "Users can delete their own recordings"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'audio' and
  (storage.foldername(name))[1] = auth.uid()::text
); 