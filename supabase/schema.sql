-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  settings jsonb default '{}'::jsonb
);

-- Create recordings table
create table public.recordings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  audio_url text not null,
  duration integer not null, -- in seconds
  transcription text,
  language text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'::jsonb
);

-- Create vocabulary table
create table public.vocabulary (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  word text not null,
  translation text not null,
  language text not null,
  context text,
  example_sentence text,
  difficulty_level integer check (difficulty_level between 1 and 5),
  last_reviewed timestamp with time zone,
  next_review timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'::jsonb
);

-- Create vocabulary reviews table
create table public.vocabulary_reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  vocabulary_id uuid references public.vocabulary(id) on delete cascade not null,
  review_date timestamp with time zone default timezone('utc'::text, now()) not null,
  success boolean not null,
  difficulty_rating integer check (difficulty_rating between 1 and 5),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create user settings table
create table public.user_settings (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  source_languages text[] default array['en'],
  target_language text default 'en',
  notification_preferences jsonb default '{"email": true, "push": true}'::jsonb,
  theme text default 'light',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create progress stats table
create table public.progress_stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  recordings_count integer default 0,
  vocabulary_added integer default 0,
  vocabulary_reviewed integer default 0,
  total_study_time integer default 0, -- in minutes
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- Add constraints
alter table public.user_settings
  add constraint source_languages_max_length check (array_length(source_languages, 1) <= 2);

alter table public.user_settings
  add constraint target_language_not_in_source check (not (target_language = any(source_languages)));

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.recordings enable row level security;
alter table public.vocabulary enable row level security;
alter table public.vocabulary_reviews enable row level security;
alter table public.user_settings enable row level security;
alter table public.progress_stats enable row level security;

-- Create RLS policies
-- Profiles policies
create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Recordings policies
create policy "Users can view own recordings"
  on recordings for select
  using ( auth.uid() = user_id );

create policy "Users can insert own recordings"
  on recordings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own recordings"
  on recordings for update
  using ( auth.uid() = user_id );

create policy "Users can delete own recordings"
  on recordings for delete
  using ( auth.uid() = user_id );

-- Vocabulary policies
create policy "Users can view own vocabulary"
  on vocabulary for select
  using ( auth.uid() = user_id );

create policy "Users can insert own vocabulary"
  on vocabulary for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own vocabulary"
  on vocabulary for update
  using ( auth.uid() = user_id );

create policy "Users can delete own vocabulary"
  on vocabulary for delete
  using ( auth.uid() = user_id );

-- Vocabulary reviews policies
create policy "Users can view own vocabulary reviews"
  on vocabulary_reviews for select
  using ( auth.uid() = user_id );

create policy "Users can insert own vocabulary reviews"
  on vocabulary_reviews for insert
  with check ( auth.uid() = user_id );

-- User settings policies
create policy "Users can view own settings"
  on user_settings for select
  using ( auth.uid() = user_id );

create policy "Users can update own settings"
  on user_settings for update
  using ( auth.uid() = user_id );

-- Progress stats policies
create policy "Users can view own progress stats"
  on progress_stats for select
  using ( auth.uid() = user_id );

create policy "Users can insert own progress stats"
  on progress_stats for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own progress stats"
  on progress_stats for update
  using ( auth.uid() = user_id );

-- Create function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Create profile record
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create default user settings
  insert into public.user_settings (
    user_id,
    source_languages,
    target_language,
    notification_preferences,
    theme
  )
  values (
    new.id,
    array['en'],
    'hu',
    '{"email": true, "push": true}'::jsonb,
    'light'
  );
  
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant necessary permissions
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres;
grant all on all sequences in schema public to postgres;
grant all on all functions in schema public to postgres; 