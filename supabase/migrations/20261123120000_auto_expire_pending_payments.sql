-- =============================================================================
-- Auto-expire stale unpaid VietQR / PayOS transactions & linked print orders
-- =============================================================================
-- If a user initiates an online payment (VietQR / PayOS / VNPay / MoMo) and
-- leaves it unpaid past the payment window (default 15 minutes), both the
-- transaction and any linked pending print order are automatically marked
-- `cancelled`. COD print orders are untouched so admins can still confirm them.

-- 1. Allow 'cancelled' status on public.transactions (idempotent)
alter table public.transactions
    drop constraint if exists transactions_status_check;

alter table public.transactions
    add constraint transactions_status_check
    check (status in ('pending', 'success', 'failed', 'refunded', 'cancelled'));

-- 2. RPC: Expire stale pending online payments & their pending print orders
create or replace function public.expire_stale_pending_payments(
    p_timeout_minutes integer default 15
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_cutoff timestamptz;
    v_tx_count integer := 0;
    v_order_count integer := 0;
    v_rec record;
    v_reason constant text := 'Tự động hủy do quá thời gian thanh toán';
begin
    if not public.is_admin()
       and coalesce(current_setting('request.jwt.claim.role', true), '') is distinct from 'service_role' then
        raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
    end if;

    v_cutoff := now() - make_interval(mins => greatest(coalesce(p_timeout_minutes, 15), 1));

    for v_rec in
        select id, order_id
        from public.transactions
        where status = 'pending'
          and coalesce(lower(payment_method), '') <> 'cod'
          and created_at < v_cutoff
        for update skip locked
    loop
        update public.transactions
        set status = 'cancelled',
            metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
                'auto_cancelled_reason', 'payment_timeout',
                'auto_cancelled_at', now()
            )
        where id = v_rec.id;

        v_tx_count := v_tx_count + 1;

        if v_rec.order_id is not null then
            update public.print_orders
            set status = 'cancelled',
                admin_notes = case
                    when coalesce(trim(admin_notes), '') = '' then v_reason
                    else admin_notes || E'\n' || v_reason
                end,
                updated_at = now()
            where id = v_rec.order_id
              and status = 'pending';

            if found then
                insert into public.print_order_status_history (
                    order_id,
                    from_status,
                    to_status,
                    changed_by,
                    note
                )
                values (
                    v_rec.order_id,
                    'pending',
                    'cancelled',
                    null,
                    v_reason
                );
                v_order_count := v_order_count + 1;
            end if;
        end if;
    end loop;

    return jsonb_build_object(
        'cancelled_transactions', v_tx_count,
        'cancelled_orders', v_order_count,
        'timeout_minutes', greatest(coalesce(p_timeout_minutes, 15), 1),
        'processed_at', now()
    );
end;
$$;

revoke all on function public.expire_stale_pending_payments(integer) from public, anon;
grant execute on function public.expire_stale_pending_payments(integer) to authenticated, service_role;
