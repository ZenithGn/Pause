#!/usr/bin/env python3
"""Validate the Pause SQL migrations against a real PostgreSQL instance.

The script boots an embedded PostgreSQL (`pgserver`), stubs the parts of the
Supabase platform the migrations rely on (`auth.users`, `auth.uid()`,
`storage.buckets`, `storage.objects`, `storage.foldername()`, API roles), then
applies every file in `supabase/migrations` in filename order and asserts the
FR-01 behaviour:

  * signup trigger creates the profile (+ display_name fallback) 
  * 3 default drawers are provisioned, 1 GiB limit each
  * drawer quota trigger blocks the 4th drawer
  * `max_drawers` can only be raised by `service_role`
  * `updated_at` trigger works
  * RLS: a user sees/updates only their own profile
  * avatars bucket is private, 5 MB, 4 storage policies

This is NOT the real Supabase stack — it is a syntax + logic check that can run
without Docker. Run it from anywhere:

    pip install pgserver "psycopg[binary]"
    python supabase/tests/validate_migrations.py

Exit code 0 = all checks passed.
"""

from __future__ import annotations

import pathlib
import sys
import tempfile
import traceback

try:
    import pgserver
    import psycopg
except ImportError:  # pragma: no cover
    sys.exit('Missing deps. Run: pip install pgserver "psycopg[binary]"')

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
MIGRATIONS = sorted((REPO_ROOT / "supabase" / "migrations").glob("*.sql"))

STUBS = r"""
create schema if not exists auth;
create schema if not exists storage;
do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create or replace function auth.uid() returns uuid language sql stable as $fn$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$fn$;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid
);
alter table storage.objects enable row level security;

-- Supabase's storage.foldername(): folder segments of the object path.
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $fn$
  select case
    when position('/' in name) = 0 then array[]::text[]
    else string_to_array(regexp_replace(name, '/[^/]*$', ''), '/')
  end
$fn$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
"""

failures: list[str] = []
checks = 0


def check(label: str, condition: bool, detail: object = "") -> None:
    global checks
    checks += 1
    if condition:
        print(f"PASS  {label}")
    else:
        failures.append(label)
        print(f"FAIL  {label}  -> {detail}")


def expect_error(label: str, conn, sql: str, needle: str) -> None:
    try:
        with conn.transaction():
            conn.execute(sql)
    except Exception as exc:  # noqa: BLE001
        check(label, needle.lower() in str(exc).lower(), exc)
        return
    check(label, False, "no exception raised")


def main() -> int:
    if not MIGRATIONS:
        sys.exit(f"No migrations found under {REPO_ROOT / 'supabase' / 'migrations'}")

    data_dir = tempfile.mkdtemp(prefix="pause-pg-")
    server = pgserver.get_server(data_dir)
    print(f"embedded postgres ready: {server.get_uri().split('@')[-1]}")
    print(f"migrations: {len(MIGRATIONS)} file(s)")

    conn = psycopg.connect(server.get_uri(), autocommit=True)
    conn.execute(STUBS)

    for migration in MIGRATIONS:
        try:
            conn.execute(migration.read_text(encoding="utf-8"))
            print(f"APPLIED  {migration.name}")
        except Exception:
            print(f"FAILED TO APPLY  {migration.name}")
            traceback.print_exc()
            return 1

    # --- FR-01.1: signup provisions profile + 3 default drawers -------------
    user_a = conn.execute(
        "insert into auth.users (email, raw_user_meta_data) "
        "values ('an@pause.app', '{\"display_name\": \"Nguyễn Văn An\"}'::jsonb) returning id"
    ).fetchone()[0]
    user_b = conn.execute(
        "insert into auth.users (email, raw_user_meta_data) "
        "values ('binh@pause.app', '{}'::jsonb) returning id"
    ).fetchone()[0]

    name_a = conn.execute(
        "select display_name from public.profiles where id=%s", (user_a,)
    ).fetchone()[0]
    name_b = conn.execute(
        "select display_name from public.profiles where id=%s", (user_b,)
    ).fetchone()[0]
    check("profile created with metadata display_name", name_a == "Nguyễn Văn An", name_a)
    check("display_name falls back to email local-part", name_b == "binh", name_b)

    drawers_a = conn.execute(
        "select count(*) from public.drawers where owner_id=%s", (user_a,)
    ).fetchone()[0]
    drawers_b = conn.execute(
        "select count(*) from public.drawers where owner_id=%s", (user_b,)
    ).fetchone()[0]
    check("3 default drawers for user A", drawers_a == 3, drawers_a)
    check("3 default drawers for user B", drawers_b == 3, drawers_b)

    max_drawers = conn.execute(
        "select max_drawers from public.profiles where id=%s", (user_a,)
    ).fetchone()[0]
    check("free tier max_drawers = 3", max_drawers == 3, max_drawers)

    limit_bytes = conn.execute(
        "select distinct storage_limit_bytes from public.drawers where owner_id=%s", (user_a,)
    ).fetchone()[0]
    check("drawer storage limit = 1 GiB", limit_bytes == 1073741824, limit_bytes)

    # --- enforce_drawer_quota ----------------------------------------------
    expect_error(
        "quota trigger blocks the 4th drawer",
        conn,
        f"insert into public.drawers (owner_id, name) values ('{user_a}', 'extra')",
        "quota",
    )

    # --- protect_profile_columns -------------------------------------------
    expect_error(
        "user cannot raise own max_drawers",
        conn,
        f"update public.profiles set max_drawers = 99 where id = '{user_a}'",
        "service role",
    )
    conn.execute("set request.jwt.claim.role = 'service_role'")
    conn.execute(f"update public.profiles set max_drawers = 5 where id = '{user_a}'")
    conn.execute("reset request.jwt.claim.role")
    raised = conn.execute(
        "select max_drawers from public.profiles where id=%s", (user_a,)
    ).fetchone()[0]
    check("service_role may raise max_drawers", raised == 5, raised)
    conn.execute("set request.jwt.claim.role = 'service_role'")
    conn.execute(f"update public.profiles set max_drawers = 3 where id = '{user_a}'")
    conn.execute("reset request.jwt.claim.role")

    # --- updated_at trigger -------------------------------------------------
    before = conn.execute(
        "select updated_at from public.profiles where id=%s", (user_a,)
    ).fetchone()[0]
    conn.execute(f"update public.profiles set phone = '0912345678' where id = '{user_a}'")
    after = conn.execute(
        "select updated_at from public.profiles where id=%s", (user_a,)
    ).fetchone()[0]
    check("updated_at trigger bumps timestamp", after > before, f"{before} -> {after}")

    # --- RLS on profiles ----------------------------------------------------
    conn.execute("grant select, update on public.profiles to authenticated")
    conn.execute("grant select, insert, update, delete on public.drawers to authenticated")
    conn.execute("set role authenticated")
    conn.execute(f"set request.jwt.claim.sub = '{user_a}'")

    visible = conn.execute("select count(*) from public.profiles").fetchone()[0]
    other = conn.execute(
        "select count(*) from public.profiles where id = %s", (str(user_b),)
    ).fetchone()[0]
    check("RLS: user sees exactly own profile", visible == 1, visible)
    check("RLS: user cannot see another profile", other == 0, other)

    updated_other = conn.execute(
        f"update public.profiles set display_name = 'hacked' where id = '{user_b}' returning id"
    ).fetchall()
    check("RLS: update on another profile affects 0 rows", len(updated_other) == 0, updated_other)

    own_rows = conn.execute(
        f"update public.profiles set display_name = 'An (edited)' where id = '{user_a}' returning id"
    ).fetchall()
    check("RLS: owner can update own profile", len(own_rows) == 1, own_rows)

    conn.execute("reset role")
    conn.execute("reset request.jwt.claim.sub")

    # --- FR-01.5: avatars bucket -------------------------------------------
    bucket = conn.execute(
        "select public, file_size_limit from storage.buckets where id='avatars'"
    ).fetchone()
    check("avatars bucket is private", bucket is not None and bucket[0] is False, bucket)
    check("avatars bucket 5 MB limit", bucket is not None and bucket[1] == 5242880, bucket)

    storage_policies = conn.execute(
        "select count(*) from pg_policies where schemaname='storage' and tablename='objects'"
    ).fetchone()[0]
    check("4 storage RLS policies for avatars", storage_policies == 4, storage_policies)

    rls = {
        name: conn.execute(
            "select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace "
            "where n.nspname='public' and c.relname=%s",
            (name,),
        ).fetchone()[0]
        for name in ("profiles", "drawers")
    }
    check("RLS enabled on profiles", rls["profiles"] is True, rls["profiles"])
    check("RLS enabled on drawers", rls["drawers"] is True, rls["drawers"])

    print(f"\n{checks - len(failures)}/{checks} checks passed")
    if failures:
        for failure in failures:
            print(f"  failed: {failure}")
        return 1
    print("ALL SQL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
