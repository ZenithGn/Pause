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
  created_at timestamptz default now(),
  last_sign_in_at timestamptz
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

    # --- privacy: a drawer is invisible to every other account -------------
    as_user(conn, bob)
    bob_drawers = conn.execute("select * from public.list_drawers()").fetchall()
    check("FR-02 drawers are private to their owner (RPC)", len(bob_drawers) == 0, bob_drawers)
    bob_direct = conn.execute("select count(*) from public.drawers").fetchone()[0]
    check("FR-02 drawers table RLS hides other users' rows", bob_direct == 0, bob_direct)
    bob_photos = conn.execute("select count(*) from public.photos").fetchone()[0]
    check("FR-02 photos table RLS hides other users' rows", bob_photos == 0, bob_photos)
    as_superuser(conn)

    # --- FR-02.7 / T-02.21: invitation is pending until accepted -----------
    as_user(conn, alice)
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
        "storage policies cover avatars + photos + thumbnails + previews + templates (incl. admin writes)",
        object_policies == 15,
        object_policies,
    )

    templates_bucket = conn.execute(
        "select public from storage.buckets where id='templates'"
    ).fetchone()
    check("templates bucket is public read", templates_bucket is not None and templates_bucket[0] is True, templates_bucket)

    plans = conn.execute("select count(*) from public.membership_plans").fetchone()[0]
    check("membership plans are seeded", plans >= 3, plans)

    templates = conn.execute("select count(*) from public.photobooth_templates").fetchone()[0]
    check("photobooth templates are seeded", templates >= 6, templates)

    layout = conn.execute(
        "select layout_config->>'width', jsonb_array_length(layout_config->'slots') "
        "from public.photobooth_templates where name = 'Classic White'"
    ).fetchone()
    check("template layout_config is valid (width + slots)", layout == ("1200", 2), layout)

    notification = conn.execute(
        "select count(*) from public.notifications where user_id=%s and type='drawer_share'",
        (bob,),
    ).fetchone()[0]
    check("FR-07 drawer share creates a notification for the recipient", notification >= 1, notification)


def check_fr06(conn) -> None:
    import json

    as_superuser(conn)
    admin1 = create_user(conn, "admin1@pause.app", "Admin One")
    admin2 = create_user(conn, "admin2@pause.app", "Admin Two")
    user1 = create_user(conn, "member@pause.app", "Member One")
    user2 = create_user(conn, "freeuser@pause.app", "Free User")

    conn.execute("set request.jwt.claim.role = 'service_role'")
    conn.execute("update public.profiles set role = 'admin', phone = '0909000001' where id in (%s, %s)", (admin1, admin2))
    conn.execute("update public.profiles set is_premium = true, max_drawers = 25, phone = '0909000002' where id = %s", (user1,))
    conn.execute("reset request.jwt.claim.role")
    conn.execute("update auth.users set last_sign_in_at = now() - interval '1 hour' where id = %s", (user1,))

    # ------------------------------------------------------------------
    # 1. Auth & execute grants + ADMIN_REQUIRED + locked admin losing access
    # ------------------------------------------------------------------
    conn.execute("set role anon")
    expect_error(
        "FR-06 anon cannot execute admin_dashboard_stats",
        conn,
        "select public.admin_dashboard_stats(null, null)",
        "permission denied",
    )
    as_superuser(conn)

    as_user(conn, user1)
    check(
        "FR-06 is_admin() returns false for non-admin",
        conn.execute("select public.is_admin()").fetchone()[0] is False,
    )
    for fn_label, sql in [
        ("admin_dashboard_stats", "select public.admin_dashboard_stats(null, null)"),
        ("admin_list_users", "select * from public.admin_list_users()"),
        ("admin_list_templates", "select * from public.admin_list_templates()"),
        ("admin_list_orders", "select * from public.admin_list_orders()"),
        ("admin_order_status_counts", "select * from public.admin_order_status_counts()"),
        ("admin_list_membership_plans", "select * from public.admin_list_membership_plans()"),
        ("admin_list_memberships", "select * from public.admin_list_memberships()"),
        ("admin_list_transactions", "select * from public.admin_list_transactions()"),
        ("admin_revenue_series", "select * from public.admin_revenue_series()"),
        ("admin_top_templates", "select * from public.admin_top_templates()"),
        ("admin_membership_distribution", "select * from public.admin_membership_distribution()"),
    ]:
        expect_error(
            f"FR-06 non-admin calling {fn_label} raises ADMIN_REQUIRED",
            conn,
            sql,
            "ADMIN_REQUIRED",
        )

    # Non-admin cannot bypass protect_profile_columns for is_premium / is_locked / role
    expect_error(
        "FR-06 user cannot change own is_premium",
        conn,
        f"update public.profiles set is_premium = false where id = '{user1}'",
        "service role",
    )
    expect_error(
        "FR-06 user cannot change own is_locked",
        conn,
        f"update public.profiles set is_locked = true where id = '{user1}'",
        "service role",
    )
    expect_error(
        "FR-06 user cannot promote self to admin",
        conn,
        f"update public.profiles set role = 'admin' where id = '{user1}'",
        "service role",
    )

    # Non-admin cannot read or write admin_audit_logs
    audit_count_user = conn.execute("select count(*) from public.admin_audit_logs").fetchone()[0]
    check("FR-06 non-admin sees 0 rows in admin_audit_logs", audit_count_user == 0, audit_count_user)
    expect_error(
        "FR-06 non-admin cannot insert admin_audit_logs",
        conn,
        f"insert into public.admin_audit_logs (admin_id, action, entity_type) values ('{user1}', 'hack', 'x')",
        "permission denied",
    )

    as_user(conn, admin1)
    check(
        "FR-06 is_admin() returns true for active admin",
        conn.execute("select public.is_admin()").fetchone()[0] is True,
    )

    # Locked admin loses access immediately
    as_superuser(conn)
    conn.execute("set request.jwt.claim.role = 'service_role'")
    conn.execute("update public.profiles set is_locked = true, locked_reason = 'Suspended' where id = %s", (admin2,))
    conn.execute("reset request.jwt.claim.role")

    as_user(conn, admin2)
    check(
        "FR-06 is_admin() returns false for locked admin",
        conn.execute("select public.is_admin()").fetchone()[0] is False,
    )
    expect_error(
        "FR-06 locked admin calling admin_dashboard_stats raises ADMIN_REQUIRED",
        conn,
        "select public.admin_dashboard_stats(null, null)",
        "ADMIN_REQUIRED",
    )
    as_superuser(conn)
    conn.execute("set request.jwt.claim.role = 'service_role'")
    conn.execute("update public.profiles set is_locked = false, locked_reason = null where id = %s", (admin2,))
    conn.execute("reset request.jwt.claim.role")

    # ------------------------------------------------------------------
    # 2. Seed drawers, photos, memberships, photobooth items, orders & transactions
    # ------------------------------------------------------------------
    plan_plus_id = conn.execute(
        "select id from public.membership_plans where name = 'PAUSE Plus'"
    ).fetchone()[0]
    plan_go_id = conn.execute(
        "select id from public.membership_plans where name = 'PAUSE Go'"
    ).fetchone()[0]

    conn.execute(
        "insert into public.memberships (user_id, plan_id, started_at, expires_at, status) "
        "values (%s, %s, now() - interval '10 days', now() + interval '5 days', 'active')",
        (user1, plan_plus_id),
    )

    drawer_u1 = conn.execute(
        "insert into public.drawers (owner_id, name) values (%s, 'Private Secrets') returning id",
        (user1,),
    ).fetchone()[0]
    ordered_photo = conn.execute(
        "insert into public.photos (drawer_id, uploaded_by, original_url, thumbnail_url, file_size_bytes, width, height) "
        "values (%s, %s, 'https://cdn.example/ordered.jpg', 'https://cdn.example/ordered_t.jpg', 500000, 1200, 1600) returning id",
        (drawer_u1, user1),
    ).fetchone()[0]
    draft_only_photo = conn.execute(
        "insert into public.photos (drawer_id, uploaded_by, original_url, thumbnail_url, file_size_bytes, width, height) "
        "values (%s, %s, 'https://cdn.example/draft_only.jpg', 'https://cdn.example/draft_t.jpg', 400000, 1200, 1600) returning id",
        (drawer_u1, user1),
    ).fetchone()[0]
    private_photo = conn.execute(
        "insert into public.photos (drawer_id, uploaded_by, original_url, thumbnail_url, file_size_bytes, width, height) "
        "values (%s, %s, 'https://cdn.example/private_secret.jpg', 'https://cdn.example/private_t.jpg', 300000, 1200, 1600) returning id",
        (drawer_u1, user1),
    ).fetchone()[0]

    classic_tpl = conn.execute(
        "select id from public.photobooth_templates where name = 'Classic White'"
    ).fetchone()[0]

    ordered_item = conn.execute(
        "insert into public.photobooth_items (user_id, template_id, preview_url, status) "
        "values (%s, %s, 'https://cdn.example/pb_ordered.png', 'ordered') returning id",
        (user1, classic_tpl),
    ).fetchone()[0]
    conn.execute(
        "insert into public.photobooth_photos (photobooth_item_id, photo_id, slot_index) values (%s, %s, 0)",
        (ordered_item, ordered_photo),
    )

    draft_item = conn.execute(
        "insert into public.photobooth_items (user_id, template_id, preview_url, status) "
        "values (%s, %s, 'https://cdn.example/pb_draft.png', 'draft') returning id",
        (user1, classic_tpl),
    ).fetchone()[0]
    conn.execute(
        "insert into public.photobooth_photos (photobooth_item_id, photo_id, slot_index) values (%s, %s, 0)",
        (draft_item, draft_only_photo),
    )

    order_main = conn.execute(
        "insert into public.print_orders (user_id, photobooth_item_id, quantity, unit_price_vnd, total_price_vnd, "
        "shipping_name, shipping_phone, shipping_address, cover_type, paper_type, status) "
        "values (%s, %s, 2, 45000, 90000, 'Member Ship', '0909000002', '10 Lê Lợi, Q.1', 'hard', 'premium', 'pending') returning id",
        (user1, ordered_item),
    ).fetchone()[0]
    order_cancel = conn.execute(
        "insert into public.print_orders (user_id, photobooth_item_id, quantity, unit_price_vnd, total_price_vnd, "
        "shipping_name, shipping_phone, shipping_address, status) "
        "values (%s, %s, 1, 35000, 35000, 'Free Ship', '0909000003', '20 Hai Bà Trưng', 'pending') returning id",
        (user2, ordered_item),
    ).fetchone()[0]

    # ------------------------------------------------------------------
    # 3. Privacy: admin RLS on photos ONLY sees photos in actual print orders
    # ------------------------------------------------------------------
    as_user(conn, admin1)
    visible_photo_ids = {
        r[0] for r in conn.execute("select id from public.photos").fetchall()
    }
    check("FR-06 privacy: admin sees photo belonging to print order", ordered_photo in visible_photo_ids, visible_photo_ids)
    check("FR-06 privacy: admin cannot see private drawer photo", private_photo not in visible_photo_ids, visible_photo_ids)
    check("FR-06 privacy: admin cannot see draft-only photobooth photo", draft_only_photo not in visible_photo_ids, visible_photo_ids)

    # ------------------------------------------------------------------
    # 4. Users RPCs: list, detail (privacy), lock/unlock rules
    # ------------------------------------------------------------------
    users_all = conn.execute("select id, tier, drawer_count, last_sign_in_at, total_count from public.admin_list_users()").fetchall()
    check("FR-06 admin_list_users returns all profiles with total_count", len(users_all) >= 4 and users_all[0][4] == len(users_all), users_all)

    users_plus = conn.execute("select id, tier from public.admin_list_users(p_tier => 'Plus')").fetchall()
    check("FR-06 admin_list_users filters tier='Plus' -> PAUSE Plus", [r[0] for r in users_plus] == [user1], users_plus)

    users_search = conn.execute("select id from public.admin_list_users(p_search => 'member@pause.app')").fetchall()
    check("FR-06 admin_list_users searches by email", [r[0] for r in users_search] == [user1], users_search)

    user_detail = conn.execute("select public.admin_get_user_detail(%s)", (user1,)).fetchone()[0]
    detail_str = json.dumps(user_detail)
    check("FR-06 admin_get_user_detail includes aggregate drawer_stats", user_detail["drawer_stats"]["drawer_count"] == 1 and user_detail["drawer_stats"]["photo_count"] == 3, user_detail["drawer_stats"])
    check("FR-06 privacy: admin_get_user_detail leaks NO private drawer photo URLs or drawer names", "private_secret.jpg" not in detail_str and "Private Secrets" not in detail_str)

    expect_error(
        "FR-06 admin cannot lock self (CANNOT_LOCK_SELF)",
        conn,
        f"select public.admin_set_user_lock('{admin1}', true, 'test')",
        "CANNOT_LOCK_SELF",
    )
    expect_error(
        "FR-06 admin cannot lock another admin (CANNOT_LOCK_ADMIN)",
        conn,
        f"select public.admin_set_user_lock('{admin2}', true, 'test')",
        "CANNOT_LOCK_ADMIN",
    )
    expect_error(
        "FR-06 locking user requires reason (LOCK_REASON_REQUIRED)",
        conn,
        f"select public.admin_set_user_lock('{user2}', true, '   ')",
        "LOCK_REASON_REQUIRED",
    )

    lock_res = conn.execute(
        "select public.admin_set_user_lock(%s, true, 'Vi phạm chính sách')",
        (user2,),
    ).fetchone()[0]
    check("FR-06 admin_set_user_lock locks user", lock_res["is_locked"] is True and lock_res["locked_at"] is not None, lock_res)

    locked_filter = conn.execute("select id from public.admin_list_users(p_status => 'locked')").fetchall()
    check("FR-06 admin_list_users filters locked status", [r[0] for r in locked_filter] == [user2], locked_filter)

    as_user(conn, user2)
    lock_notif = conn.execute(
        "select count(*) from public.notifications where user_id = %s and type = 'system'",
        (user2,),
    ).fetchone()[0]
    check("FR-06 locking user creates system notification", lock_notif >= 1, lock_notif)

    as_user(conn, admin1)
    unlock_res = conn.execute(
        "select public.admin_set_user_lock(%s, false, null)",
        (user2,),
    ).fetchone()[0]
    check("FR-06 admin_set_user_lock unlocks user", unlock_res["is_locked"] is False and unlock_res["locked_at"] is None, unlock_res)

    # ------------------------------------------------------------------
    # 5. Templates RPCs & layout_config validation trigger
    # ------------------------------------------------------------------
    valid_layout = json.dumps({
        "width": 1200,
        "height": 1800,
        "background_color": "#FFFFFF",
        "slots": [
            {"index": 0, "x": 60, "y": 100, "width": 1080, "height": 700},
            {"index": 1, "x": 60, "y": 860, "width": 1080, "height": 700},
        ],
        "texts": [{"content": "Test", "x": 600, "y": 1700, "font_size": 40, "color": "#111111"}],
        "frame_url": None,
    })

    expect_error(
        "FR-06 invalid empty layout_config raises INVALID_LAYOUT_CONFIG",
        conn,
        "select public.admin_upsert_template(null, 'Bad Layout', 'general', 'https://cdn.example/p.png', false, true, '{}'::jsonb)",
        "INVALID_LAYOUT_CONFIG",
    )
    expect_error(
        "FR-06 out-of-bounds slot in layout_config raises INVALID_LAYOUT_CONFIG",
        conn,
        """select public.admin_upsert_template(null, 'Bad Slot Bounds', 'general', 'https://cdn.example/p.png', false, true,
            '{"width":1200,"height":1800,"slots":[{"index":0,"x":500,"y":100,"width":900,"height":500}]}'::jsonb)""",
        "INVALID_LAYOUT_CONFIG",
    )
    expect_error(
        "FR-06 duplicate slot index in layout_config raises INVALID_LAYOUT_CONFIG",
        conn,
        """select public.admin_upsert_template(null, 'Dup Slot Index', 'general', 'https://cdn.example/p.png', false, true,
            '{"width":1200,"height":1800,"slots":[{"index":0,"x":50,"y":50,"width":200,"height":200},{"index":0,"x":300,"y":50,"width":200,"height":200}]}'::jsonb)""",
        "INVALID_LAYOUT_CONFIG",
    )

    new_tpl = conn.execute(
        "select public.admin_upsert_template(null, 'FR06 Admin Custom', 'couple', 'https://cdn.example/custom.png', true, true, %s::jsonb)",
        (valid_layout,),
    ).fetchone()[0]
    new_tpl_id = new_tpl["id"]
    check("FR-06 admin_upsert_template creates template with computed slot_count", new_tpl["slot_count"] == 2 and new_tpl["is_premium"] is True, new_tpl)

    expect_error(
        "FR-06 duplicate template name raises TEMPLATE_NAME_TAKEN",
        conn,
        f"select public.admin_upsert_template(null, 'Classic White', 'couple', 'https://cdn.example/x.png', false, true, '{valid_layout}'::jsonb)",
        "TEMPLATE_NAME_TAKEN",
    )

    # Trigger enforces slot_count = jsonb_array_length(slots) even on direct insert with mismatched slot_count
    as_superuser(conn)
    mismatched_slot_count = conn.execute(
        "insert into public.photobooth_templates (name, category, preview_url, slot_count, layout_config) "
        "values ('Direct Trigger Test', 'general', 'https://cdn.example/d.png', 99, %s::jsonb) returning slot_count",
        (valid_layout,),
    ).fetchone()[0]
    check("FR-06 trigger enforces slot_count = jsonb_array_length(slots)", mismatched_slot_count == 2, mismatched_slot_count)
    conn.execute("delete from public.photobooth_templates where name = 'Direct Trigger Test'")

    as_user(conn, admin1)
    conn.execute("select public.admin_set_template_active(%s, false)", (new_tpl_id,))
    as_user(conn, user1)
    user_sees_inactive_tpl = conn.execute(
        "select count(*) from public.photobooth_templates where id = %s", (new_tpl_id,)
    ).fetchone()[0]
    check("FR-06 non-admin cannot see inactive template", user_sees_inactive_tpl == 0, user_sees_inactive_tpl)

    as_user(conn, admin1)
    admin_sees_inactive_tpl = conn.execute(
        "select count(*) from public.photobooth_templates where id = %s", (new_tpl_id,)
    ).fetchone()[0]
    check("FR-06 admin sees inactive template", admin_sees_inactive_tpl == 1, admin_sees_inactive_tpl)

    expect_error(
        "FR-06 deleting template referenced by photobooth_items raises TEMPLATE_IN_USE",
        conn,
        f"select public.admin_delete_template('{classic_tpl}')",
        "TEMPLATE_IN_USE",
    )
    conn.execute("select public.admin_delete_template(%s)", (new_tpl_id,))
    check(
        "FR-06 deleting unused template succeeds",
        conn.execute("select count(*) from public.photobooth_templates where id = %s", (new_tpl_id,)).fetchone()[0] == 0,
    )

    # ------------------------------------------------------------------
    # 6. Orders RPCs, state machine, history RLS, & FR-07 notification sync
    # ------------------------------------------------------------------
    orders_list = conn.execute("select id, short_code, payment_method, payment_status, total_count from public.admin_list_orders()").fetchall()
    check("FR-06 admin_list_orders returns orders with short_code and total_count", len(orders_list) >= 2 and orders_list[0][1] == str(orders_list[0][0])[:8].upper(), orders_list)

    status_counts = dict(conn.execute("select status, count from public.admin_order_status_counts()").fetchall())
    check("FR-06 admin_order_status_counts returns all 6 statuses", set(status_counts.keys()) == {"pending", "processing", "printing", "shipping", "completed", "cancelled"} and status_counts["pending"] >= 2, status_counts)

    # Invalid transitions before advancing
    expect_error(
        "FR-06 invalid transition pending -> completed raises INVALID_STATUS_TRANSITION",
        conn,
        f"select public.admin_update_order_status('{order_main}', 'completed', null)",
        "INVALID_STATUS_TRANSITION",
    )
    expect_error(
        "FR-06 cancelling without note raises CANCEL_NOTE_REQUIRED",
        conn,
        f"select public.admin_update_order_status('{order_cancel}', 'cancelled', '  ')",
        "CANCEL_NOTE_REQUIRED",
    )

    # Valid transition chain: pending -> processing -> printing -> shipping -> completed
    for next_st in ("processing", "printing", "shipping", "completed"):
        res = conn.execute(
            "select public.admin_update_order_status(%s, %s, %s)",
            (order_main, next_st, f"Moved to {next_st}"),
        ).fetchone()[0]
        check(f"FR-06 valid order transition -> {next_st}", res["status"] == next_st, res)

    expect_error(
        "FR-06 completed order cannot transition (INVALID_STATUS_TRANSITION)",
        conn,
        f"select public.admin_update_order_status('{order_main}', 'cancelled', 'reason')",
        "INVALID_STATUS_TRANSITION",
    )

    # Cancel with note
    cancel_res = conn.execute(
        "select public.admin_update_order_status(%s, 'cancelled', 'Khách yêu cầu hủy')",
        (order_cancel,),
    ).fetchone()[0]
    check("FR-06 cancel with note succeeds", cancel_res["status"] == "cancelled", cancel_res)

    expect_error(
        "FR-06 cancelled order cannot transition (INVALID_STATUS_TRANSITION)",
        conn,
        f"select public.admin_update_order_status('{order_cancel}', 'processing', null)",
        "INVALID_STATUS_TRANSITION",
    )

    conn.execute("select public.admin_update_order_notes(%s, 'Ghi chú nội bộ test')", (order_main,))
    order_detail = conn.execute("select public.admin_get_order_detail(%s)", (order_main,)).fetchone()[0]
    check("FR-06 admin_get_order_detail returns slot_photos & full status_history", len(order_detail["slot_photos"]) == 1 and len(order_detail["status_history"]) == 5 and order_detail["order"]["admin_notes"] == "Ghi chú nội bộ test", order_detail)

    # Verify FR-07 trigger notify_print_order_status fired for processing, printing, shipping, completed!
    as_superuser(conn)
    notif_statuses = {
        r[0]
        for r in conn.execute(
            "select data->>'status' from public.notifications where user_id = %s and type = 'print_order' and data->>'order_id' = %s",
            (user1, str(order_main)),
        ).fetchall()
    }
    check(
        "FR-06/FR-07 notify_print_order_status notifies for processing, printing, shipping, completed",
        {"processing", "printing", "shipping", "completed"}.issubset(notif_statuses),
        notif_statuses,
    )

    # Verify print_order_status_history RLS: owner sees own order history, not other user's
    as_user(conn, user1)
    u1_hist_own = conn.execute("select count(*) from public.print_order_status_history where order_id = %s", (order_main,)).fetchone()[0]
    u1_hist_other = conn.execute("select count(*) from public.print_order_status_history where order_id = %s", (order_cancel,)).fetchone()[0]
    check("FR-06 status_history RLS allows order owner and blocks others", u1_hist_own == 5 and u1_hist_other == 0, (u1_hist_own, u1_hist_other))

    # ------------------------------------------------------------------
    # 7. Membership plans, memberships & transactions RPCs
    # ------------------------------------------------------------------
    as_user(conn, admin1)
    plans_list = conn.execute("select name, subscriber_count, active_subscriber_count from public.admin_list_membership_plans(true)").fetchall()
    plus_row = [r for r in plans_list if r[0] == "PAUSE Plus"][0]
    check("FR-06 admin_list_membership_plans counts active subscribers", plus_row[1] >= 1 and plus_row[2] >= 1, plans_list)

    expect_error(
        "FR-06 deleting plan in use raises PLAN_IN_USE",
        conn,
        f"select public.admin_delete_membership_plan('{plan_plus_id}')",
        "PLAN_IN_USE",
    )
    expect_error(
        "FR-06 duplicate plan name raises PLAN_NAME_TAKEN",
        conn,
        "select public.admin_upsert_membership_plan(null, 'PAUSE Go', null, 30000, 'yearly', 10, 5368709120, true, true)",
        "PLAN_NAME_TAKEN",
    )

    new_plan = conn.execute(
        "select public.admin_upsert_membership_plan(null, 'PAUSE Studio Test', 'Test plan', 150000, 'yearly', 80, 32212254720, true, false)"
    ).fetchone()[0]
    new_plan_id = new_plan["id"]
    check("FR-06 admin_upsert_membership_plan creates inactive plan", new_plan["is_active"] is False and new_plan["price_vnd"] == 150000, new_plan)

    as_user(conn, user1)
    check(
        "FR-06 non-admin cannot see inactive membership plan",
        conn.execute("select count(*) from public.membership_plans where id = %s", (new_plan_id,)).fetchone()[0] == 0,
    )
    as_user(conn, admin1)
    check(
        "FR-06 admin can see inactive membership plan",
        conn.execute("select count(*) from public.membership_plans where id = %s", (new_plan_id,)).fetchone()[0] == 1,
    )
    conn.execute("select public.admin_delete_membership_plan(%s)", (new_plan_id,))
    check(
        "FR-06 deleting unused membership plan succeeds",
        conn.execute("select count(*) from public.membership_plans where id = %s", (new_plan_id,)).fetchone()[0] == 0,
    )

    expiring_mems = conn.execute(
        "select user_id, days_left from public.admin_list_memberships(p_status => 'active', p_expiring_within_days => 7)"
    ).fetchall()
    check("FR-06 admin_list_memberships filters expiring_within_days and computes days_left", len(expiring_mems) >= 1 and 1 <= expiring_mems[0][1] <= 7, expiring_mems)

    # ------------------------------------------------------------------
    # 8. Transactions, Dashboard Stats & Asia/Ho_Chi_Minh Timezone Checks
    # ------------------------------------------------------------------
    as_superuser(conn)
    # 2026-11-19 18:00:00+00 == 2026-11-20 01:00:00+07 (Asia/Ho_Chi_Minh)
    conn.execute(
        "insert into public.transactions (user_id, order_id, type, amount_vnd, payment_method, payment_gateway_ref, order_code, status, created_at) values "
        "(%s, %s, 'print_order', 90000, 'vietqr_payos', 'GW_OK_1', 777000001, 'success', '2026-11-19 18:00:00+00'::timestamptz), "
        "(%s, null, 'membership', 55000, 'vietqr_payos', 'GW_OK_2', 777000002, 'success', '2026-11-20 03:00:00+00'::timestamptz), "
        "(%s, %s, 'print_order', 999999, 'vietqr_payos', 'GW_PEND', 777000003, 'pending', '2026-11-20 04:00:00+00'::timestamptz), "
        "(%s, %s, 'print_order', 888888, 'vietqr_payos', 'GW_FAIL', 777000004, 'failed', '2026-11-20 05:00:00+00'::timestamptz)",
        (user1, order_main, user1, user2, order_cancel, user2, order_cancel),
    )

    as_user(conn, admin1)
    tx_search = conn.execute(
        "select order_code, status from public.admin_list_transactions(p_search => '777000001')"
    ).fetchall()
    check("FR-06 admin_list_transactions searches by order_code", tx_search == [(777000001, "success")], tx_search)

    stats_nov19 = conn.execute(
        "select public.admin_dashboard_stats('2026-11-19'::date, '2026-11-19'::date)"
    ).fetchone()[0]
    stats_nov20 = conn.execute(
        "select public.admin_dashboard_stats('2026-11-20'::date, '2026-11-20'::date)"
    ).fetchone()[0]
    check(
        "FR-06 timezone: 2026-11-19T18:00Z counts in 2026-11-20 Asia/Ho_Chi_Minh, not 2026-11-19",
        stats_nov19["revenue_range_vnd"] == 0 and stats_nov20["revenue_range_vnd"] == 145000,
        (stats_nov19, stats_nov20),
    )

    series = conn.execute(
        "select bucket::text, print_revenue_vnd, membership_revenue_vnd from public.admin_revenue_series('2026-11-19'::date, '2026-11-20'::date, 'day')"
    ).fetchall()
    check(
        "FR-06 admin_revenue_series splits print vs membership revenue in VN timezone",
        series == [("2026-11-19", 0, 0), ("2026-11-20", 90000, 55000)],
        series,
    )

    top_tpls = conn.execute("select name, order_count, revenue_vnd from public.admin_top_templates(null, null, 5)").fetchall()
    check("FR-06 admin_top_templates excludes cancelled orders and sums paid revenue", len(top_tpls) == 1 and top_tpls[0] == ("Classic White", 1, 90000), top_tpls)

    dist = dict(conn.execute("select plan_name, active_count from public.admin_membership_distribution()").fetchall())
    total_users = stats_nov20["total_users"]
    check(
        "FR-06 admin_membership_distribution includes Free and sums to total_users",
        "Free" in dist and dist.get("PAUSE Plus", 0) >= 1 and sum(dist.values()) == total_users,
        (dist, total_users),
    )

    # Admin can read audit logs created during this test
    audit_count_admin = conn.execute("select count(*) from public.admin_audit_logs").fetchone()[0]
    check("FR-06 admin_audit_logs records admin mutations and is readable by admin", audit_count_admin >= 10, audit_count_admin)

    # Verify unused plan_go can still be fetched cleanly
    check("FR-06 plan_go exists", plan_go_id is not None)
    as_superuser(conn)


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

    check_fr01(conn)
    check_fr02(conn)
    check_fr06(conn)

    # ------------------------------------------------------------------
    # Re-apply every migration in order: this is what `supabase db push` does on
    # a project whose schema was applied manually (no migration history), so it
    # must be safe and converge to the same state.
    # ------------------------------------------------------------------
    reapplied = True
    try:
        for migration in MIGRATIONS:
            conn.execute(migration.read_text(encoding="utf-8"))
    except Exception as error:  # noqa: BLE001
        reapplied = False
        print(f"FAIL  re-apply failed: {error}")
    check("Migrations are safe to re-apply (manual/db-push convergence)", reapplied)

    placeholder_trigger = conn.execute(
        "select count(*) from pg_trigger where tgname = 'on_profile_created_create_default_drawers'"
    ).fetchone()[0]
    check("Re-apply still leaves the placeholder trigger dropped", placeholder_trigger == 0, placeholder_trigger)

    list_drawers_body = conn.execute(
        "select prosrc from pg_proc where proname = 'list_drawers' limit 1"
    ).fetchone()[0]
    check(
        "Re-apply keeps list_drawers filtering accepted shares only",
        "status = 'accepted'" in list_drawers_body,
        list_drawers_body[:120],
    )

    stats_overloads = conn.execute(
        "select count(*), min(pg_get_function_identity_arguments(p.oid)) "
        "from pg_proc p join pg_namespace n on n.oid = p.pronamespace "
        "where n.nspname = 'public' and p.proname = 'admin_dashboard_stats'"
    ).fetchone()
    check(
        "Re-apply keeps single unambiguous admin_dashboard_stats(date, date)",
        stats_overloads[0] == 1 and stats_overloads[1] == "p_from date, p_to date",
        stats_overloads,
    )

    notify_body = conn.execute(
        "select prosrc from pg_proc where proname = 'notify_print_order_status' limit 1"
    ).fetchone()[0]
    check(
        "Re-apply keeps notify_print_order_status synced with processing/completed",
        "when 'processing'" in notify_body and "when 'completed'" in notify_body and "when 'confirmed'" not in notify_body,
        notify_body[:120],
    )

    rls = {
        name: conn.execute(
            "select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace "
            "where n.nspname='public' and c.relname=%s",
            (name,),
        ).fetchone()[0]
        for name in (
            "profiles",
            "drawers",
            "photos",
            "drawer_shares",
            "admin_audit_logs",
            "print_order_status_history",
            "photobooth_templates",
            "membership_plans",
            "print_orders",
            "transactions",
            "memberships",
        )
    }
    for table, enabled in rls.items():
        check(f"RLS enabled on {table}", enabled is True, enabled)

    # Apply supabase/seed/admin_seed.sql twice to verify seed idempotency
    seed_file = REPO_ROOT / "supabase" / "seed" / "admin_seed.sql"
    seed_sql = seed_file.read_text(encoding="utf-8")
    seed_ok = True
    try:
        conn.execute(seed_sql)
        conn.execute(seed_sql)
    except Exception as error:  # noqa: BLE001
        seed_ok = False
        print(f"FAIL  admin_seed.sql failed: {error}")
    check("FR-06 admin_seed.sql is valid and idempotent (run twice)", seed_ok)

    if seed_ok:
        seed_orders = conn.execute(
            "select count(distinct status) from public.print_orders where id::text like '55555555-%'"
        ).fetchone()[0]
        check("FR-06 admin_seed.sql seeds orders across all 6 statuses", seed_orders == 6, seed_orders)

        # Verify auto-expiry of stale pending VietQR transactions & linked pending print_orders
        as_user(conn, "11111111-1111-4111-8111-111111111101")
        expire_res = conn.execute(
            "select public.expire_stale_pending_payments(15)"
        ).fetchone()[0]
        as_superuser(conn)
        check(
            "FR-06 expire_stale_pending_payments cancels stale pending seed tx & linked pending order",
            expire_res.get("cancelled_transactions", 0) >= 1
            and expire_res.get("cancelled_orders", 0) >= 1,
            expire_res,
        )
        tx4_status = conn.execute(
            "select status from public.transactions where id = '77777777-7777-4777-8777-777777777704'"
        ).fetchone()[0]
        order1_status = conn.execute(
            "select status from public.print_orders where id = '55555555-5555-4555-8555-555555555501'"
        ).fetchone()[0]
        check("FR-06 stale pending transaction becomes cancelled", tx4_status == "cancelled", tx4_status)
        check("FR-06 stale unpaid online print_order becomes cancelled", order1_status == "cancelled", order1_status)

    print(f"\n{checks - len(failures)}/{checks} checks passed")
    if failures:
        for failure in failures:
            print(f"  failed: {failure}")
        return 1
    print("ALL SQL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
