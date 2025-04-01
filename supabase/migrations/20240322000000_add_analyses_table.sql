-- Create analyses table
create table if not exists public.analyses (
    id uuid primary key default gen_random_uuid(),
    recording_id uuid not null references public.recordings(id) on delete cascade,
    items jsonb not null default '[]',
    created_at timestamp with time zone not null default timezone('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Add RLS policies
alter table public.analyses enable row level security;

create policy "Users can view own analyses"
    on public.analyses
    for select
    using (
        exists (
            select 1 from public.recordings
            where recordings.id = analyses.recording_id
            and recordings.user_id = auth.uid()
        )
    );

create policy "Users can insert own analyses"
    on public.analyses
    for insert
    with check (
        exists (
            select 1 from public.recordings
            where recordings.id = analyses.recording_id
            and recordings.user_id = auth.uid()
        )
    );

-- Add trigger for updated_at
create trigger handle_updated_at before update on public.analyses
    for each row execute function moddatetime('updated_at'); 