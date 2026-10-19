-- =============================================================================
-- FR-01 – Authentication & Account
-- T-01.03 – public.profiles + trigger handle_new_user()
-- Ref: docs/03-References/db-schema.md
-- =============================================================================

create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null,
    avatar_url text,
    phone text,
    -- Free tier: 3 drawers (FR-02.2). Raised by membership / one-time purchase.
    max_drawers integer not null default 3 check (max_drawers >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.profiles is
    'Public profile of a Pause user, 1:1 with auth.users. Created by handle_new_user().';
comment on column public.profiles.avatar_url is
    'Storage object path inside the private "avatars" bucket (resolved through a signed URL).';
comment on column public.profiles.max_drawers is
    'Maximum number of owned drawers. Free tier = 3.';

-- -----------------------------------------------------------------------------
-- shared updated_at helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- T-01.03 – create the profile automatically when a user signs up
-- Runs with SECURITY DEFINER so the API role never needs INSERT on profiles.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name, phone)
    values (
        new.id,
        coalesce(
            nullif(new.raw_user_meta_data ->> 'display_name', ''),
            nullif(new.raw_user_meta_data ->> 'full_name', ''),
            nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
            'Pause User'
        ),
        nullif(new.raw_user_meta_data ->> 'phone', '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

comment on function public.handle_new_user() is
    'Creates the matching public.profiles row for every new auth.users row.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Keep display_name in sync with the Google / OAuth metadata (first sign-in only).
-- -----------------------------------------------------------------------------
create or replace function public.handle_user_metadata_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    meta_name text;
begin
    meta_name := coalesce(
        nullif(new.raw_user_meta_data ->> 'display_name', ''),
        nullif(new.raw_user_meta_data ->> 'full_name', '')
    );

    if meta_name is not null then
        update public.profiles
        set display_name = meta_name
        where id = new.id
          and (display_name is null or display_name = '' or display_name = 'Pause User');
    end if;

    return new;
end;
$$;

drop trigger if exists on_auth_user_metadata_updated on auth.users;
create trigger on_auth_user_metadata_updated
    after update of raw_user_meta_data on auth.users
    for each row execute function public.handle_user_metadata_update();
