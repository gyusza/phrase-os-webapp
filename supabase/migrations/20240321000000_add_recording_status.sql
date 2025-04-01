-- Add status field to recordings table
alter table recordings add column status text not null default 'new' check (status in ('new', 'analyzed'));

-- Update existing recordings to have a status
update recordings set status = 'analyzed' where transcription is not null;
update recordings set status = 'new' where transcription is null; 