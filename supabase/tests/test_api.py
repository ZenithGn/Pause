#!/usr/bin/env python3
"""API smoke & security test suite for Pause (Supabase REST/Auth/RPC + Web Admin).

Outputs PASS / FAIL checks (same style as `validate_migrations.py`) and exits 0
when all checks pass. Uses only Python's standard library (zero pip installs).

Usage:
    # Run public + RLS security API checks (auto-reads app/web-admin/.env or env vars):
    python supabase/tests/test_api.py

    # Also test authenticated Admin RPC APIs:
    python supabase/tests/test_api.py --admin-email admin@example.com --admin-password secret

    # Also test running Next.js Web Admin HTTP endpoints:
    python supabase/tests/test_api.py --web-url http://localhost:3000

Environment variables (optional; fallback reads app/web-admin/.env & app/mobile/local.properties):
    NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY
    TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
    WEB_ADMIN_URL
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]

checks = 0
skipped = 0
failures: list[str] = []


def check(label: str, condition: bool, detail: object = "", elapsed_ms: float | None = None) -> None:
    global checks
    checks += 1
    timing = f" ({elapsed_ms:.0f}ms)" if elapsed_ms is not None else ""
    if condition:
        print(f"PASS  {label}{timing}")
    else:
        failures.append(label)
        print(f"FAIL  {label}{timing}  -> {detail}")


def skip(label: str, reason: str) -> None:
    global skipped
    skipped += 1
    print(f"SKIP  {label}  ({reason})")


def load_key_values(path: pathlib.Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw_line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and val:
            values[key] = val
    return values


def resolve_supabase_config() -> tuple[str, str]:
    env_files = [
        REPO_ROOT / "app" / "web-admin" / ".env.local",
        REPO_ROOT / "app" / "web-admin" / ".env",
        REPO_ROOT / "app" / "mobile" / "local.properties",
    ]
    merged: dict[str, str] = {}
    for file_path in reversed(env_files):
        merged.update(load_key_values(file_path))

    url = (
        os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        or os.environ.get("SUPABASE_URL")
        or merged.get("NEXT_PUBLIC_SUPABASE_URL")
        or merged.get("SUPABASE_URL")
        or ""
    ).rstrip("/")

    anon_key = (
        os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or merged.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or merged.get("SUPABASE_ANON_KEY")
        or ""
    )
    return url, anon_key


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[override]
        return None


NO_REDIRECT_OPENER = urllib.request.build_opener(NoRedirectHandler)


def http_request(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    body: dict[str, object] | None = None,
    timeout: float = 15.0,
    follow_redirects: bool = True,
) -> tuple[int, dict[str, str], object, float]:
    req_headers = {"Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    data: bytes | None = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        req_headers.setdefault("Content-Type", "application/json")

    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    opener = urllib.request.build_opener() if follow_redirects else NO_REDIRECT_OPENER
    start = time.perf_counter()
    try:
        with opener.open(req, timeout=timeout) as resp:
            elapsed = (time.perf_counter() - start) * 1000
            raw = resp.read().decode("utf-8", errors="replace")
            resp_headers = {k.lower(): v for k, v in resp.headers.items()}
            try:
                parsed: object = json.loads(raw) if raw else None
            except json.JSONDecodeError:
                parsed = raw
            return resp.status, resp_headers, parsed, elapsed
    except urllib.error.HTTPError as err:
        elapsed = (time.perf_counter() - start) * 1000
        raw = err.read().decode("utf-8", errors="replace")
        resp_headers = {k.lower(): v for k, v in err.headers.items()} if err.headers else {}
        try:
            parsed = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            parsed = raw
        return err.code, resp_headers, parsed, elapsed


def run_supabase_public_and_rls_checks(supabase_url: str, anon_key: str) -> None:
    anon_headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
    }

    # 1. Auth health / settings endpoint
    status, _, payload, ms = http_request(
        "GET",
        f"{supabase_url}/auth/v1/settings",
        headers={"apikey": anon_key},
    )
    check(
        "API Auth /auth/v1/settings responds 200 JSON",
        status == 200 and isinstance(payload, dict),
        f"status={status}",
        ms,
    )

    # 2. Invalid credentials rejected cleanly
    status, _, _, ms = http_request(
        "POST",
        f"{supabase_url}/auth/v1/token?grant_type=password",
        headers={"apikey": anon_key},
        body={"email": "nonexistent-api-test@pause.invalid", "password": "wrong-password-123"},
    )
    check(
        "API Auth rejects invalid email/password (400)",
        status in (400, 401),
        f"status={status}",
        ms,
    )

    # 3. Public catalog reads (templates + membership_plans)
    status, _, payload, ms = http_request(
        "GET",
        f"{supabase_url}/rest/v1/photobooth_templates?select=id,name,category,slot_count,is_premium,is_active&is_active=eq.true",
        headers=anon_headers,
    )
    check(
        "API REST GET /photobooth_templates (active) returns 200 list",
        status == 200 and isinstance(payload, list),
        f"status={status}, type={type(payload).__name__}",
        ms,
    )

    status, _, payload, ms = http_request(
        "GET",
        f"{supabase_url}/rest/v1/membership_plans?select=id,name,price_vnd,duration_type,is_active&is_active=eq.true",
        headers=anon_headers,
    )
    check(
        "API REST GET /membership_plans (active) returns 200 non-empty list",
        status == 200 and isinstance(payload, list) and len(payload) > 0,
        f"status={status}, count={len(payload) if isinstance(payload, list) else 'N/A'}",
        ms,
    )

    # 4. RLS protection: anon MUST NOT read private user tables
    private_tables = [
        "profiles",
        "drawers",
        "photos",
        "drawer_shares",
        "print_orders",
        "transactions",
        "memberships",
        "notifications",
        "admin_audit_logs",
    ]
    for table in private_tables:
        status, _, payload, ms = http_request(
            "GET",
            f"{supabase_url}/rest/v1/{table}?select=id&limit=5",
            headers=anon_headers,
        )
        blocked_or_empty = (status in (401, 403)) or (status == 200 and payload == [])
        check(
            f"API RLS anon blocked/empty on GET /{table}",
            blocked_or_empty,
            f"status={status}, payload={str(payload)[:120]}",
            ms,
        )

    # 5. Admin RPC protection: anon MUST be denied
    admin_rpcs = [
        ("admin_dashboard_stats", {}),
        ("admin_list_users", {"p_limit": 5, "p_offset": 0}),
        ("admin_list_templates", {"p_limit": 5, "p_offset": 0}),
        ("admin_list_orders", {"p_limit": 5, "p_offset": 0}),
        ("admin_list_transactions", {"p_limit": 5, "p_offset": 0}),
    ]
    for fn_name, args in admin_rpcs:
        status, _, payload, ms = http_request(
            "POST",
            f"{supabase_url}/rest/v1/rpc/{fn_name}",
            headers=anon_headers,
            body=args,
        )
        check(
            f"API RPC anon denied on /rpc/{fn_name}",
            status in (400, 401, 403, 404),
            f"status={status}, payload={str(payload)[:120]}",
            ms,
        )


def run_admin_rpc_checks(
    supabase_url: str,
    anon_key: str,
    email: str,
    password: str,
) -> None:
    status, _, payload, ms = http_request(
        "POST",
        f"{supabase_url}/auth/v1/token?grant_type=password",
        headers={"apikey": anon_key},
        body={"email": email, "password": password},
    )
    token = payload.get("access_token") if isinstance(payload, dict) else None
    check(
        "API Auth admin sign-in returns access_token",
        status == 200 and isinstance(token, str) and len(token) > 20,
        f"status={status}",
        ms,
    )
    if not isinstance(token, str):
        return

    admin_headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {token}",
    }

    status, _, payload, ms = http_request(
        "POST",
        f"{supabase_url}/rest/v1/rpc/is_admin",
        headers=admin_headers,
        body={},
    )
    check("API RPC /rpc/is_admin returns true", status == 200 and payload is True, f"status={status}, payload={payload}", ms)

    rpc_list: list[tuple[str, dict[str, object], str]] = [
        ("admin_dashboard_stats", {}, "dict"),
        ("admin_list_users", {"p_limit": 5, "p_offset": 0}, "list"),
        ("admin_list_templates", {"p_limit": 5, "p_offset": 0}, "list"),
        ("admin_list_orders", {"p_limit": 5, "p_offset": 0}, "list"),
        ("admin_order_status_counts", {}, "list"),
        ("admin_list_membership_plans", {"p_include_inactive": True}, "list"),
        ("admin_list_memberships", {"p_limit": 5, "p_offset": 0}, "list"),
        ("admin_list_transactions", {"p_limit": 5, "p_offset": 0}, "list"),
        ("admin_revenue_series", {}, "list"),
        ("admin_top_templates", {"p_limit": 5}, "list"),
        ("admin_membership_distribution", {}, "list"),
    ]
    for fn_name, args, expected_kind in rpc_list:
        status, _, payload, ms = http_request(
            "POST",
            f"{supabase_url}/rest/v1/rpc/{fn_name}",
            headers=admin_headers,
            body=args,
        )
        ok_kind = isinstance(payload, dict) if expected_kind == "dict" else isinstance(payload, list)
        check(
            f"API RPC admin /rpc/{fn_name} returns 200 {expected_kind}",
            status == 200 and ok_kind,
            f"status={status}, payload={str(payload)[:140]}",
            ms,
        )


def run_web_admin_http_checks(web_url: str) -> None:
    base = web_url.rstrip("/")
    try:
        status, headers, _, ms = http_request(
            "GET",
            f"{base}/admin/login",
            timeout=5.0,
            follow_redirects=False,
        )
    except urllib.error.URLError as exc:
        skip(f"Web Admin HTTP checks ({base})", f"server not running: {exc.reason}")
        return

    check("API Web GET /admin/login returns 200", status == 200, f"status={status}", ms)
    check(
        "API Web security headers present (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)",
        "x-frame-options" in headers
        and "x-content-type-options" in headers
        and "referrer-policy" in headers,
        f"headers={list(headers.keys())}",
    )

    status, headers, _, ms = http_request(
        "GET",
        f"{base}/admin",
        timeout=5.0,
        follow_redirects=False,
    )
    location = headers.get("location", "")
    check(
        "API Web GET /admin unauthenticated redirects to /admin/login (307/302)",
        status in (302, 307) and "/admin/login" in location,
        f"status={status}, location={location}",
        ms,
    )

    status, _, _, ms = http_request(
        "GET",
        f"{base}/api/admin/orders/00000000-0000-0000-0000-000000000000/print-pack",
        timeout=5.0,
        follow_redirects=False,
    )
    check(
        "API Web GET /api/admin/orders/[id]/print-pack unauthenticated returns 401/403",
        status in (401, 403),
        f"status={status}",
        ms,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Pause API smoke & security checks")
    parser.add_argument("--admin-email", default=os.environ.get("TEST_ADMIN_EMAIL", ""))
    parser.add_argument("--admin-password", default=os.environ.get("TEST_ADMIN_PASSWORD", ""))
    parser.add_argument("--web-url", default=os.environ.get("WEB_ADMIN_URL", "http://localhost:3000"))
    parser.add_argument("--skip-web", action="store_true", help="Skip localhost Web Admin HTTP checks")
    args = parser.parse_args()

    supabase_url, anon_key = resolve_supabase_config()
    if not supabase_url or not anon_key:
        print("FAIL  Missing SUPABASE_URL / SUPABASE_ANON_KEY (set env vars or app/web-admin/.env)")
        return 1

    print(f"target supabase: {supabase_url}")
    run_supabase_public_and_rls_checks(supabase_url, anon_key)

    if args.admin_email and args.admin_password:
        run_admin_rpc_checks(supabase_url, anon_key, args.admin_email, args.admin_password)
    else:
        skip("API Admin authenticated RPC suite (12 checks)", "pass --admin-email & --admin-password to enable")

    if not args.skip_web and args.web_url:
        run_web_admin_http_checks(args.web_url)

    passed = checks - len(failures)
    skip_note = f" ({skipped} skipped)" if skipped else ""
    print(f"\n{passed}/{checks} checks passed{skip_note}")
    if failures:
        for item in failures:
            print(f"  failed: {item}")
        return 1
    print("ALL API CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
