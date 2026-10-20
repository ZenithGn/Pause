#!/usr/bin/env python3
"""Validate the Pause SQL migrations against a real PostgreSQL instance.

Boots an embedded PostgreSQL (`pgserver`), stubs the Supabase platform pieces the
migrations rely on (`auth.users`, `auth.uid()`, `storage.buckets`,
`storage.objects`, `storage.foldername()`, API roles), applies every file in
`supabase/migrations` in filename order and asserts the FR-01 / FR-02 behaviour.

This is NOT the real Supabase stack — it is a syntax + logic check that runs
without Docker:

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

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
MIGRATIONS = sorted((REPO_ROOT / "supabase" / "migrations").glob("*.sql"))

FREE_DRAWER_LIMIT = 268435456  # 256 MB

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
        check(label, needle.lower() in str(exc).lower(), f"{exc}")
        return
    check(label, False, "no exception raised")


def create_user(conn, email: str, display_name: str) -> str:
    return conn.execute(
        "insert into auth.users (email, raw_user_meta_data) values (%s, %s) returning id",
        (email, '{"display_name": "%s"}' % display_name),
    ).fetchone()[0]


def as_user(conn, user_id) -> None:
    conn.execute("set role authenticated")
    conn.execute(f"set request.jwt.claim.sub = '{user_id}'")


def as_superuser(conn) -> None:
    conn.execute("reset role")
    conn.execute("reset request.jwt.claim.sub")


def check_fr01(conn) -> None:
    user_a = create_user(conn, "an@pause.app", "Nguyễn Văn An")
    user_b = create_user(conn, "binh@pause.app", "")

    name_a = conn.execute(
        "select display_name from public.profiles where id=%s", (user_a,)
    ).fetchone()[0]
    name_b = conn.execute(
        "select display_name from public.profiles where id=%s", (user_b,)
    ).fetchone()[0]
    check("FR-01 profile created with metadata display_name", name_a == "Nguyễn Văn An", name_a)
    check("FR-01 display_name falls back to email local-part", name_b == "binh", name_b)

    drawers = conn.execute(
        "select count(*) from public.drawers where owner_id=%s", (user_a,)
    ).fetchone()[0]
    check("FR-02 repair: signup no longer pre-creates placeholder drawers", drawers == 0, drawers)

    max_drawers = conn.execute(
        "select max_drawers from public.profiles where id=%s", (user_a,)
    ).fetchone()[0]
    check("FR-01 free tier max_drawers = 3", max_drawers == 3, max_drawers)

    created = conn.execute(
        f"insert into public.drawers (owner_id, name) values ('{user_a}', 'Du lịch') "
        "returning storage_limit_bytes"
    ).fetchone()[0]
    check("FR-02 new drawer quota = 256 MB", created == FREE_DRAWER_LIMIT, created)

    conn.execute(f"insert into public.drawers (owner_id, name) values ('{user_a}', 'Sinh nhật')")
    conn.execute(f"insert into public.drawers (owner_id, name) values ('{user_a}', 'Gia đình')")
    expect_error(
        "FR-01 quota trigger blocks the 4th drawer",
        conn,
        f"insert into public.drawers (owner_id, name) values ('{user_a}', 'extra')",
        "quota",
    )
    expect_error(
        "FR-01 user cannot raise own max_drawers",
        conn,
        f"update public.profiles set max_drawers = 99 where id = '{user_a}'",
        "service role",
    )

    before = conn.execute(
        "select updated_at from public.profiles where id=%s", (user_a,)
    ).fetchone()[0]
    conn.execute(f"update public.profiles set phone = '0912345678' where id = '{user_a}'")
    after = conn.execute(
        "select updated_at from public.profiles where id=%s", (user_a,)
    ).fetchone()[0]
    check("FR-01 updated_at trigger bumps timestamp", after > before, f"{before} -> {after}")

    conn.execute("grant select, update on public.profiles to authenticated")
    as_user(conn, user_a)
    visible = conn.execute("select count(*) from public.profiles").fetchone()[0]
    other = conn.execute(
        "select count(*) from public.profiles where id = %s", (str(user_b),)
    ).fetchone()[0]
    check("FR-01 RLS: user sees exactly own profile", visible == 1, visible)
    check("FR-01 RLS: user cannot see another profile", other == 0, other)

    updated_other = conn.execute(
        f"update public.profiles set display_name = 'hacked' where id = '{user_b}' returning id"
    ).fetchall()
    check("FR-01 RLS: updating another profile affects 0 rows", len(updated_other) == 0)
    as_superuser(conn)

    bucket = conn.execute(
        "select public, file_size_limit from storage.buckets where id='avatars'"
    ).fetchone()
    check("FR-01 avatars bucket is private", bucket is not None and bucket[0] is False, bucket)
    check("FR-01 avatars bucket 5 MB limit", bucket is not None and bucket[1] == 5242880, bucket)


def check_fr02(conn) -> None:
    alice = create_user(conn, "alice@pause.app", "Alice")
    bob = create_user(conn, "bob@pause.app", "Bob")
    carol = create_user(conn, "carol@pause.app", "Carol")

    drawer = conn.execute(
        "insert into public.drawers (owner_id, name) values (%s, 'Đà Lạt 2026') returning id",
        (alice,),
    ).fetchone()[0]

    # Supabase grants ALL on public tables to the API roles by default.
    conn.execute("grant select, insert, delete on public.drawers to authenticated")
    conn.execute("grant select, insert, delete on public.photos to authenticated")
    conn.execute("grant select, insert, update, delete on public.drawer_shares to authenticated")

    # --- photos + storage accounting ---------------------------------------
    as_user(conn, alice)
    photo = conn.execute(
        "insert into public.photos (drawer_id, uploaded_by, original_url, thumbnail_url, file_size_bytes) "
        "values (%s, %s, %s, %s, %s) returning id",
        (drawer, alice, f"{drawer}/p1.jpg", f"{drawer}/p1.webp", 1200000),
    ).fetchone()[0]
    used = conn.execute(
        "select storage_used_bytes from public.drawers where id=%s", (drawer,)
    ).fetchone()[0]
    check("FR-02 photo insert increments storage_used_bytes", used == 1200000, used)

    expect_error(
        "FR-02 oversized compressed photo rejected (>5 MB)",
        conn,
        f"insert into public.photos (drawer_id, uploaded_by, original_url, file_size_bytes) "
        f"values ('{drawer}', '{alice}', '{drawer}/big.jpg', 6291456)",
        "5 mb",
    )
    as_superuser(conn)
    conn.execute("update public.drawers set storage_used_bytes = storage_limit_bytes - 100 where id=%s", (drawer,))
    as_user(conn, alice)
    expect_error(
        "FR-02 server blocks uploads that exceed the drawer quota",
        conn,
        f"insert into public.photos (drawer_id, uploaded_by, original_url, file_size_bytes) "
        f"values ('{drawer}', '{alice}', '{drawer}/p2.jpg', 500)",
        "storage full",
    )
    as_superuser(conn)
    conn.execute("update public.drawers set storage_used_bytes = 1200000 where id=%s", (drawer,))

    # --- protected drawer columns ------------------------------------------
    as_user(conn, alice)
    expect_error(
        "FR-02 client cannot write storage_used_bytes",
        conn,
        f"update public.drawers set storage_used_bytes = 0 where id = '{drawer}'",
        "permission denied",
    )
    renamed = conn.execute(
        f"update public.drawers set name = 'Đà Lạt 2026' where id = '{drawer}' returning id"
    ).fetchall()
    check("FR-02 owner can rename a drawer", len(renamed) == 1, renamed)

    # --- FR-02.7 / T-02.21: invitation is pending until accepted -----------
    share_id = conn.execute(
        "select public.share_drawer(%s, %s, %s)", (str(drawer), "bob@pause.app", "view")
    ).fetchone()[0]
    status = conn.execute(
        "select status from public.drawer_shares where id=%s", (share_id,)
    ).fetchone()[0]
    check("FR-02 share_drawer creates a PENDING invitation", status == "pending", status)

    expect_error(
        "FR-02 cannot share with yourself",
        conn,
        f"select public.share_drawer('{drawer}', 'alice@pause.app', 'view')",
        "yourself",
    )
    expect_error(
        "FR-02 unknown email is rejected",
        conn,
        f"select public.share_drawer('{drawer}', 'nobody@pause.app', 'view')",
        "no pause user",
    )

    recipient = conn.execute(
        "select id, display_name from public.find_share_recipient('bob@pause.app')"
    ).fetchone()
    check(
        "FR-02 find_share_recipient resolves exact email",
        recipient is not None and recipient[0] == bob,
        recipient,
    )
    check(
        "FR-02 find_share_recipient excludes self",
        len(conn.execute("select * from public.find_share_recipient('alice@pause.app')").fetchall()) == 0,
    )
    shares = conn.execute(
        "select email, display_name, permission, status from public.list_drawer_shares(%s)", (str(drawer),)
    ).fetchall()
    check(
        "FR-02 owner share list exposes email + status",
        shares == [("bob@pause.app", "Bob", "view", "pending")],
        shares,
    )

    # pending invitation must not grant access
    as_user(conn, bob)
    shared = conn.execute("select is_owner from public.list_drawers()").fetchall()
    check("FR-02 pending invitation does not expose the drawer", all(row[0] for row in shared), shared)
    invitations = conn.execute(
        "select drawer_name, owner_name, permission, status from public.list_share_invitations()"
    ).fetchall()
    check(
        "FR-02 recipient sees the pending invitation",
        invitations == [("Đà Lạt 2026", "Alice", "view", "pending")],
        invitations,
    )

    # T-02.22: only the invited user can respond
    as_user(conn, alice)
    expect_error(
        "FR-02 only the invited user can respond",
        conn,
        f"select public.respond_share_invitation('{share_id}', true)",
        "only the invited user",
    )

    # accept -> drawer becomes visible
    as_user(conn, bob)
    conn.execute("select public.respond_share_invitation(%s, true)", (str(share_id),))
    accepted_status = conn.execute(
        "select status from public.drawer_shares where id=%s", (share_id,)
    ).fetchone()[0]
    check("FR-02 recipient accepts the invitation", accepted_status == "accepted", accepted_status)

    invitations_after = conn.execute("select * from public.list_share_invitations()").fetchall()
    check("FR-02 accepted invitation leaves the pending list", len(invitations_after) == 0)
    shared_drawers = [
        row for row in conn.execute(
            "select name, owner_name, is_owner, permission, photo_count from public.list_drawers()"
        ).fetchall()
        if row[2] is False
    ]
    check(
        "FR-02 accepted share shows up for the recipient",
        len(shared_drawers) == 1
        and shared_drawers[0][0] == "Đà Lạt 2026"
        and shared_drawers[0][1] == "Alice"
        and shared_drawers[0][3] == "view",
        shared_drawers,
    )
    check("FR-02 shared drawer photo_count", shared_drawers[0][4] == 1, shared_drawers[0][4])
    expect_error(
        "FR-02 invitation cannot be answered twice",
        conn,
        f"select public.respond_share_invitation('{share_id}', true)",
        "already answered",
    )

    # owner sees accepted status; re-inviting with edit keeps it accepted
    as_user(conn, alice)
    conn.execute("select public.share_drawer(%s, %s, %s)", (str(drawer), "bob@pause.app", "edit"))
    upgraded = conn.execute(
        "select permission, status from public.drawer_shares where id=%s", (share_id,)
    ).fetchone()
    check("FR-02 re-invite upgrades permission and keeps acceptance", upgraded == ("edit", "accepted"), upgraded)

    # non-owner cannot share / list shares
    as_user(conn, bob)
    expect_error(
        "FR-02 non-owner cannot invite",
        conn,
        f"select public.share_drawer('{drawer}', 'carol@pause.app', 'view')",
        "only the drawer owner",
    )
    bob_view_shares = conn.execute("select * from public.list_drawer_shares(%s)", (str(drawer),)).fetchall()
    check("FR-02 non-owner gets no share list", len(bob_view_shares) == 0, bob_view_shares)

    # edit permission allows uploads
    bob_photo = conn.execute(
        "insert into public.photos (drawer_id, uploaded_by, original_url, file_size_bytes) "
        "values (%s, %s, %s, %s) returning id",
        (drawer, bob, f"{drawer}/p3.jpg", 800000),
    ).fetchone()[0]
    check(
        "FR-02 edit permission can upload into a shared drawer",
        conn.execute("select count(*) from public.photos where id=%s", (bob_photo,)).fetchone()[0] == 1,
    )

    # view permission must block uploads
    as_superuser(conn)
    conn.execute("update public.drawer_shares set permission='view' where id=%s", (share_id,))
    as_user(conn, bob)
    expect_error(
        "FR-02 view permission cannot upload",
        conn,
        f"insert into public.photos (drawer_id, uploaded_by, original_url, file_size_bytes) "
        f"values ('{drawer}', '{bob}', '{drawer}/p4.jpg', 1000)",
        "row-level security",
    )
    deleted = conn.execute(
        f"delete from public.drawers where id='{drawer}' returning id"
    ).fetchall()
    check("FR-02 shared recipient cannot delete the drawer", len(deleted) == 0, deleted)

    # FR-02.7 reject flow: revoke, re-invite, reject -> drawer hidden again
    as_user(conn, alice)
    conn.execute("delete from public.drawer_shares where id=%s", (share_id,))
    second_share = conn.execute(
        "select public.share_drawer(%s, %s, %s)", (str(drawer), "bob@pause.app", "view")
    ).fetchone()[0]
    as_user(conn, bob)
    conn.execute("select public.respond_share_invitation(%s, false)", (str(second_share),))
    rejected = conn.execute(
        "select status from public.drawer_shares where id=%s", (second_share,)
    ).fetchone()[0]
    check("FR-02 recipient can reject an invitation", rejected == "rejected", rejected)
    after_reject = [
        row for row in conn.execute(
            "select is_owner from public.list_drawers()"
        ).fetchall()
        if row[0] is False
    ]
    check("FR-02 rejected drawer is no longer visible", len(after_reject) == 0, after_reject)

    # another user cannot answer someone else's invitation
    as_user(conn, carol)
    expect_error(
        "FR-02 third party cannot respond to a rejected invitation",
        conn,
        f"select public.respond_share_invitation('{second_share}', true)",
        "only the invited user",
    )

    # --- deletion accounting ------------------------------------------------
    as_superuser(conn)
    used_before = conn.execute(
        "select storage_used_bytes from public.drawers where id=%s", (drawer,)
    ).fetchone()[0]
    conn.execute("delete from public.photos where id=%s", (photo,))
    used_after = conn.execute(
        "select storage_used_bytes from public.drawers where id=%s", (drawer,)
    ).fetchone()[0]
    check(
        "FR-02 deleting a photo releases storage",
        used_after == used_before - 1200000,
        f"{used_before} -> {used_after}",
    )

    # --- storage buckets ----------------------------------------------------
    bucket = conn.execute(
        "select public, file_size_limit from storage.buckets where id='photos'"
    ).fetchone()
    check("FR-02 photos bucket is private", bucket is not None and bucket[0] is False, bucket)
    thumbs = conn.execute(
        "select public, file_size_limit from storage.buckets where id='thumbnails'"
    ).fetchone()
    check(
        "FR-02 thumbnails bucket is private, 1 MB",
        thumbs is not None and thumbs[1] == 1048576,
        thumbs,
    )
    object_policies = conn.execute(
        "select count(*) from pg_policies where schemaname='storage' and tablename='objects'"
    ).fetchone()[0]
    check(
        "FR-02 8 storage policies (avatars + photos + thumbnails)",
        object_policies == 8,
        object_policies,
    )


def check_repair(conn, repair_sql: str) -> None:
    """Re-applies the repair migration and asserts placeholder cleanup."""
    dave = create_user(conn, "dave@pause.app", "Dave")

    placeholder = conn.execute(
        "insert into public.drawers (owner_id, name) values (%s, 'Ngăn kéo kỷ niệm 1') returning id",
        (dave,),
    ).fetchone()[0]
    kept = conn.execute(
        "insert into public.drawers (owner_id, name) values (%s, 'Đà Lạt 2025') returning id",
        (dave,),
    ).fetchone()[0]

    conn.execute(repair_sql)

    remaining = conn.execute(
        "select id from public.drawers where id in (%s, %s)", (placeholder, kept)
    ).fetchall()
    ids = {row[0] for row in remaining}
    check("FR-02 repair deletes untouched auto placeholder drawers", placeholder not in ids, ids)
    check("FR-02 repair keeps user-named drawers", kept in ids, ids)


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

    repair_sql = (REPO_ROOT / "supabase" / "migrations" / "20251114090000_fr02_repair.sql").read_text(
        encoding="utf-8"
    )

    check_fr01(conn)
    check_fr02(conn)
    check_repair(conn, repair_sql)

    rls = {
        name: conn.execute(
            "select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace "
            "where n.nspname='public' and c.relname=%s",
            (name,),
        ).fetchone()[0]
        for name in ("profiles", "drawers", "photos", "drawer_shares")
    }
    for table, enabled in rls.items():
        check(f"RLS enabled on {table}", enabled is True, enabled)

    print(f"\n{checks - len(failures)}/{checks} checks passed")
    if failures:
        for failure in failures:
            print(f"  failed: {failure}")
        return 1
    print("ALL SQL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
