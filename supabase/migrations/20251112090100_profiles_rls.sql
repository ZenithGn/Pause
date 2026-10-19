-- =============================================================================
-- FR-01 – Authentication & Account
-- T-01.04 – Row Level Security for public.profiles
-- Ref: docs/03-References/db-schema.md, AGENTS.md (RLS must stay enabled)
-- =============================================================================

alter table public.profiles enable row level security;

-- The API roles should only ever touch their own row. INSERT/DELETE stay
-- unavailable to clients: rows are created by handle_new_user() (SECURITY
-- DEFINER) and removed by the auth.users ON DELETE CASCADE.
revoke all on public.profiles from anon;
revoke insert, delete on public.profiles from authenticated;
grant select, update on public.profiles to authenticated;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
    on public.profiles
    for select
    to authenticated
    using ((select auth.uid()) = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
    on public.profiles
    for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

-- Guard rails: users must not be able to escalate their own quota, and the
-- identity columns are immutable. Enforced with a trigger because column-level
-- grants alone would also block the legitimate profile update path.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
    if new.id <> old.id then
        raise exception 'profiles.id is immutable';
    end if;

    if new.max_drawers <> old.max_drawers
        and current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
        raise exception 'profiles.max_drawers can only be changed by the service role';
    end if;

    return new;
end;
$$;

drop trigger if exists protect_profiles_columns on public.profiles;
create trigger protect_profiles_columns
    before update on public.profiles
    for each row execute function public.protect_profile_columns();
