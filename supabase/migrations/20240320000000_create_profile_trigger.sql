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
    default_language,
    daily_vocabulary_goal,
    notification_preferences,
    theme
  )
  values (
    new.id,
    'en',
    10,
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