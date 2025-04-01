-- Update user_settings table to support multiple source languages
alter table public.user_settings 
  drop column if exists default_language,
  add column source_languages text[] default array['en'],
  add column target_language text default 'en';

-- Add constraint to ensure source_languages has at most 2 languages
alter table public.user_settings
  add constraint source_languages_max_length check (array_length(source_languages, 1) <= 2);

-- Add constraint to ensure target_language is not in source_languages
alter table public.user_settings
  add constraint target_language_not_in_source check (not (target_language = any(source_languages)));

-- Update the handle_new_user function
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