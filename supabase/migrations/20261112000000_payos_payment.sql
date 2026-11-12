-- =============================================================================
-- Migration: 20261112000000_payos_payment.sql
-- Description: FR-05 Payment integration with PayOS / VietQR App-to-App
--              and auto-detection webhook / RPC support.
-- =============================================================================

-- 1. Ensure order_code exists on public.transactions
alter table public.transactions
    add column if not exists order_code bigint;

create unique index if not exists idx_transactions_order_code
    on public.transactions (order_code)
    where order_code is not null;

-- 2. Populate updated membership plans (PAUSE Go, Plus, Premium)
insert into public.membership_plans
    (name, description, price_vnd, duration_type, extra_drawers, extra_storage_bytes, access_premium_templates, is_active)
values
    ('PAUSE Go', 'Gói hội viên PAUSE Go: 5GB/năm, 10 ngăn kéo, mở khóa VIP Templates', 30000, 'yearly', 10, 5368709120, true, true),
    ('PAUSE Plus', 'Gói hội viên PAUSE Plus: 10GB/năm, 25 ngăn kéo, mở khóa VIP Templates', 55000, 'yearly', 25, 10737418240, true, true),
    ('PAUSE Premium', 'Gói hội viên PAUSE Premium: 20GB/năm, 50 ngăn kéo, mở khóa toàn diện VIP Templates', 100000, 'yearly', 50, 21474836480, true, true)
on conflict (name) do update
set price_vnd = excluded.price_vnd,
    extra_drawers = excluded.extra_drawers,
    extra_storage_bytes = excluded.extra_storage_bytes,
    description = excluded.description,
    is_active = true;

-- 3. RPC: Create Payment Checkout Transaction
create or replace function public.create_payment_checkout(
    p_payment_type text,
    p_ref_id text,
    p_amount_vnd integer,
    p_order_code bigint default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_order_code bigint;
    v_tx_id uuid;
    v_order_id uuid := null;
begin
    if v_user_id is null then
        raise exception 'Unauthorized: User must be signed in to create payment';
    end if;

    if p_order_code is not null then
        v_order_code := p_order_code;
    else
        v_order_code := floor(100000000 + random() * 900000000)::bigint;
    end if;

    if p_payment_type = 'print_order' then
        begin
            v_order_id := p_ref_id::uuid;
        exception when others then
            v_order_id := null;
        end;
    end if;

    insert into public.transactions (
        user_id,
        order_id,
        type,
        amount_vnd,
        payment_method,
        payment_gateway_ref,
        order_code,
        status,
        metadata
    ) values (
        v_user_id,
        v_order_id,
        case when p_payment_type = 'print_order' then 'print_order' else 'membership' end,
        p_amount_vnd,
        'vietqr_payos',
        'PAYOS_' || v_order_code,
        v_order_code,
        'pending',
        jsonb_build_object(
            'payment_type', p_payment_type,
            'ref_id', p_ref_id,
            'order_code', v_order_code
        )
    )
    returning id into v_tx_id;

    return jsonb_build_object(
        'transaction_id', v_tx_id,
        'order_code', v_order_code,
        'amount_vnd', p_amount_vnd,
        'payment_type', p_payment_type,
        'ref_id', p_ref_id,
        'status', 'pending'
    );
end;
$$;

-- 4. RPC: Complete Payment Transaction (Idempotent, handles auto-detection & webhooks)
create or replace function public.complete_payment_transaction(
    p_order_code bigint,
    p_gateway_ref text default 'vietqr_auto',
    p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_tx public.transactions%rowtype;
    v_plan_id uuid;
    v_target_drawers int := 3;
    v_payment_type text;
    v_ref_id text;
begin
    -- 1. Locate transaction
    select * into v_tx
    from public.transactions
    where order_code = p_order_code
    order by created_at desc
    limit 1;

    if v_tx.id is null then
        select * into v_tx
        from public.transactions
        where (metadata->>'order_code')::bigint = p_order_code
        order by created_at desc
        limit 1;
    end if;

    if v_tx.id is null then
        return jsonb_build_object('success', false, 'message', 'Transaction not found for code: ' || p_order_code);
    end if;

    if v_tx.status = 'success' then
        return jsonb_build_object(
            'success', true,
            'message', 'Transaction was already completed',
            'transaction_id', v_tx.id,
            'order_code', p_order_code
        );
    end if;

    -- 2. Mark transaction as success
    update public.transactions
    set status = 'success',
        payment_gateway_ref = coalesce(p_gateway_ref, payment_gateway_ref),
        metadata = coalesce(metadata, '{}'::jsonb) || p_metadata
    where id = v_tx.id;

    v_payment_type := coalesce(v_tx.metadata->>'payment_type', v_tx.type);
    v_ref_id := v_tx.metadata->>'ref_id';

    -- 3. Apply business effects
    if v_tx.type = 'membership' or v_payment_type in ('pause_go', 'pause_plus', 'pause_premium', 'membership_yearly', 'membership_monthly') then
        if v_payment_type = 'pause_go' then
            v_target_drawers := 10;
            select id into v_plan_id from public.membership_plans where name = 'PAUSE Go' limit 1;
        elsif v_payment_type = 'pause_plus' then
            v_target_drawers := 25;
            select id into v_plan_id from public.membership_plans where name = 'PAUSE Plus' limit 1;
        elsif v_payment_type = 'pause_premium' then
            v_target_drawers := 50;
            select id into v_plan_id from public.membership_plans where name = 'PAUSE Premium' limit 1;
        else
            v_target_drawers := 15;
            select id into v_plan_id from public.membership_plans where is_active order by price_vnd asc limit 1;
        end if;

        -- Update user profile
        update public.profiles
        set is_premium = true,
            max_drawers = greatest(max_drawers, v_target_drawers)
        where id = v_tx.user_id;

        -- Upsert active membership record
        if v_plan_id is not null then
            insert into public.memberships (
                user_id,
                plan_id,
                started_at,
                expires_at,
                status
            ) values (
                v_tx.user_id,
                v_plan_id,
                now(),
                now() + interval '1 year',
                'active'
            );
        end if;

        -- Create in-app notification
        insert into public.notifications (
            user_id,
            type,
            title,
            body,
            data
        ) values (
            v_tx.user_id,
            'membership',
            'Nâng cấp Hội viên thành công!',
            'Tài khoản của bạn đã được nâng cấp thành công gói ' || upper(v_payment_type) || '. Bạn đã được mở rộng tối đa ' || v_target_drawers || ' ngăn kéo và toàn bộ VIP Templates.',
            jsonb_build_object('order_code', p_order_code, 'plan', v_payment_type)
        );

    elsif v_tx.type = 'print_order' and v_tx.order_id is not null then
        -- Update order status to processing
        update public.print_orders
        set status = 'processing'
        where id = v_tx.order_id;

        -- Create in-app notification
        insert into public.notifications (
            user_id,
            type,
            title,
            body,
            data
        ) values (
            v_tx.user_id,
            'print_order',
            'Thanh toán đơn in thành công',
            'Đơn in Photobooth của bạn đã được thanh toán thành công và chuyển sang xưởng in.',
            jsonb_build_object('order_id', v_tx.order_id, 'order_code', p_order_code)
        );
    end if;

    return jsonb_build_object(
        'success', true,
        'message', 'Transaction completed successfully',
        'transaction_id', v_tx.id,
        'order_code', p_order_code
    );
end;
$$;

-- 5. RPC: Get Payment Status
create or replace function public.get_payment_transaction_status(p_order_code bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_status text;
    v_tx_id uuid;
begin
    select status, id into v_status, v_tx_id
    from public.transactions
    where order_code = p_order_code
       or (metadata->>'order_code')::bigint = p_order_code
    order by created_at desc
    limit 1;

    return jsonb_build_object(
        'order_code', p_order_code,
        'status', coalesce(v_status, 'pending'),
        'transaction_id', v_tx_id
    );
end;
$$;

-- 6. Permissions
grant execute on function public.create_payment_checkout(text, text, integer, bigint) to authenticated;
grant execute on function public.complete_payment_transaction(bigint, text, jsonb) to authenticated, service_role;
grant execute on function public.get_payment_transaction_status(bigint) to authenticated, anon;

