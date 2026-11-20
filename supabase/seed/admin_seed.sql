-- =============================================================================
-- FR-06 / T-06.B21 – Local & Staging Seed Data for Admin Dashboard
--
-- WARNING: FOR LOCAL / STAGING ONLY. DO NOT RUN IN PRODUCTION.
-- Idempotent: safe to execute multiple times.
--
-- Seeded accounts (local GoTrue password when auth.users has encrypted_password):
--   - admin@pause.app / PauseAdmin123! (role = 'admin')
--   - linh@pause.app  / PauseUser123!  (member: PAUSE Plus)
--   - minh@pause.app  / PauseUser123!  (free tier, expired past membership)
-- =============================================================================

do $$
declare
    v_admin_id uuid := '11111111-1111-4111-8111-111111111101';
    v_user1_id uuid := '11111111-1111-4111-8111-111111111102';
    v_user2_id uuid := '11111111-1111-4111-8111-111111111103';

    v_drawer1_id uuid := '22222222-2222-4222-8222-222222222201';
    v_drawer2_id uuid := '22222222-2222-4222-8222-222222222202';

    v_photo1_id uuid := '33333333-3333-4333-8333-333333333301';
    v_photo2_id uuid := '33333333-3333-4333-8333-333333333302';
    v_photo3_id uuid := '33333333-3333-4333-8333-333333333303';
    v_photo4_id uuid := '33333333-3333-4333-8333-333333333304';

    v_tpl_classic uuid;
    v_tpl_vintage uuid;
    v_tpl_gold uuid;

    v_item1_id uuid := '44444444-4444-4444-8444-444444444401';
    v_item2_id uuid := '44444444-4444-4444-8444-444444444402';
    v_item3_id uuid := '44444444-4444-4444-8444-444444444403';

    v_order1_id uuid := '55555555-5555-4555-8555-555555555501'; -- pending
    v_order2_id uuid := '55555555-5555-4555-8555-555555555502'; -- processing
    v_order3_id uuid := '55555555-5555-4555-8555-555555555503'; -- printing
    v_order4_id uuid := '55555555-5555-4555-8555-555555555504'; -- shipping
    v_order5_id uuid := '55555555-5555-4555-8555-555555555505'; -- completed
    v_order6_id uuid := '55555555-5555-4555-8555-555555555506'; -- cancelled

    v_plan_go_id uuid;
    v_plan_plus_id uuid;
    v_mem1_id uuid := '66666666-6666-4666-8666-666666666601';
    v_mem2_id uuid := '66666666-6666-4666-8666-666666666602';

    v_tx1_id uuid := '77777777-7777-4777-8777-777777777701';
    v_tx2_id uuid := '77777777-7777-4777-8777-777777777702';
    v_tx3_id uuid := '77777777-7777-4777-8777-777777777703';
    v_tx4_id uuid := '77777777-7777-4777-8777-777777777704';
    v_tx5_id uuid := '77777777-7777-4777-8777-777777777705';
    v_tx6_id uuid := '77777777-7777-4777-8777-777777777706';

    v_has_encrypted_pw boolean;
begin
    -- 1) Seed auth.users (supports both full Supabase GoTrue schema and minimal SQL stubs)
    select exists (
        select 1
        from information_schema.columns
        where table_schema = 'auth'
          and table_name = 'users'
          and column_name = 'encrypted_password'
    ) into v_has_encrypted_pw;

    if v_has_encrypted_pw then
        execute $sql$
            insert into auth.users (
                id, instance_id, aud, role, email, encrypted_password,
                email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                created_at, updated_at, last_sign_in_at,
                confirmation_token, email_change, email_change_token_new, recovery_token
            )
            values
                (
                    '11111111-1111-4111-8111-111111111101',
                    '00000000-0000-0000-0000-000000000000',
                    'authenticated', 'authenticated',
                    'admin@pause.app',
                    crypt('PauseAdmin123!', gen_salt('bf')),
                    now(),
                    '{"provider":"email","providers":["email"]}'::jsonb,
                    '{"display_name":"Admin Pause"}'::jsonb,
                    now() - interval '60 days', now(), now() - interval '1 hour',
                    '', '', '', ''
                ),
                (
                    '11111111-1111-4111-8111-111111111102',
                    '00000000-0000-0000-0000-000000000000',
                    'authenticated', 'authenticated',
                    'linh@pause.app',
                    crypt('PauseUser123!', gen_salt('bf')),
                    now(),
                    '{"provider":"email","providers":["email"]}'::jsonb,
                    '{"display_name":"Ngọc Linh"}'::jsonb,
                    now() - interval '20 days', now(), now() - interval '2 days',
                    '', '', '', ''
                ),
                (
                    '11111111-1111-4111-8111-111111111103',
                    '00000000-0000-0000-0000-000000000000',
                    'authenticated', 'authenticated',
                    'minh@pause.app',
                    crypt('PauseUser123!', gen_salt('bf')),
                    now(),
                    '{"provider":"email","providers":["email"]}'::jsonb,
                    '{"display_name":"Hoàng Minh"}'::jsonb,
                    now() - interval '5 days', now(), now() - interval '12 hours',
                    '', '', '', ''
                )
            on conflict (id) do nothing
        $sql$;

        if to_regclass('auth.identities') is not null then
            execute $sql$
                insert into auth.identities (
                    id, user_id, provider_id, identity_data, provider,
                    last_sign_in_at, created_at, updated_at
                )
                values
                    (
                        '11111111-1111-4111-8111-111111111101',
                        '11111111-1111-4111-8111-111111111101',
                        'admin@pause.app',
                        '{"sub":"11111111-1111-4111-8111-111111111101","email":"admin@pause.app"}'::jsonb,
                        'email', now(), now(), now()
                    ),
                    (
                        '11111111-1111-4111-8111-111111111102',
                        '11111111-1111-4111-8111-111111111102',
                        'linh@pause.app',
                        '{"sub":"11111111-1111-4111-8111-111111111102","email":"linh@pause.app"}'::jsonb,
                        'email', now(), now(), now()
                    ),
                    (
                        '11111111-1111-4111-8111-111111111103',
                        '11111111-1111-4111-8111-111111111103',
                        'minh@pause.app',
                        '{"sub":"11111111-1111-4111-8111-111111111103","email":"minh@pause.app"}'::jsonb,
                        'email', now(), now(), now()
                    )
                on conflict do nothing
            $sql$;
        end if;
    else
        insert into auth.users (id, email, raw_user_meta_data, created_at, last_sign_in_at)
        values
            (v_admin_id, 'admin@pause.app', '{"display_name":"Admin Pause"}'::jsonb, now() - interval '60 days', now() - interval '1 hour'),
            (v_user1_id, 'linh@pause.app', '{"display_name":"Ngọc Linh"}'::jsonb, now() - interval '20 days', now() - interval '2 days'),
            (v_user2_id, 'minh@pause.app', '{"display_name":"Hoàng Minh"}'::jsonb, now() - interval '5 days', now() - interval '12 hours')
        on conflict (id) do nothing;
    end if;

    -- 2) Update profiles safely via protection bypass
    perform set_config('app.bypass_profile_protection', 'on', true);

    update public.profiles
    set display_name = 'Admin Pause',
        phone = '0901000001',
        role = 'admin',
        is_locked = false
    where id = v_admin_id;

    update public.profiles
    set display_name = 'Ngọc Linh',
        phone = '0901000002',
        role = 'user',
        is_premium = true,
        max_drawers = 25,
        is_locked = false
    where id = v_user1_id;

    update public.profiles
    set display_name = 'Hoàng Minh',
        phone = '0901000003',
        role = 'user',
        is_premium = false,
        max_drawers = 3,
        is_locked = false
    where id = v_user2_id;

    perform set_config('app.bypass_profile_protection', 'off', true);

    -- 3) Ensure the 3 standard membership plans exist
    insert into public.membership_plans
        (name, description, price_vnd, duration_type, extra_drawers, extra_storage_bytes, access_premium_templates, is_active)
    values
        ('PAUSE Go', 'Gói hội viên PAUSE Go: 5GB/năm, 10 ngăn kéo, mở khóa VIP Templates', 30000, 'yearly', 10, 5368709120, true, true),
        ('PAUSE Plus', 'Gói hội viên PAUSE Plus: 10GB/năm, 25 ngăn kéo, mở khóa VIP Templates', 55000, 'yearly', 25, 10737418240, true, true),
        ('PAUSE Premium', 'Gói hội viên PAUSE Premium: 20GB/năm, 50 ngăn kéo, mở khóa toàn diện VIP Templates', 100000, 'yearly', 50, 21474836480, true, true)
    on conflict (name) do nothing;

    select id into v_plan_go_id from public.membership_plans where name = 'PAUSE Go' limit 1;
    select id into v_plan_plus_id from public.membership_plans where name = 'PAUSE Plus' limit 1;

    -- 4) Seed memberships (1 active, 1 expired)
    if v_plan_plus_id is not null and not exists (select 1 from public.memberships where id = v_mem1_id) then
        insert into public.memberships (id, user_id, plan_id, started_at, expires_at, status, created_at)
        values (v_mem1_id, v_user1_id, v_plan_plus_id, now() - interval '15 days', now() + interval '350 days', 'active', now() - interval '15 days');
    end if;

    if v_plan_go_id is not null and not exists (select 1 from public.memberships where id = v_mem2_id) then
        insert into public.memberships (id, user_id, plan_id, started_at, expires_at, status, created_at)
        values (v_mem2_id, v_user2_id, v_plan_go_id, now() - interval '375 days', now() - interval '10 days', 'expired', now() - interval '375 days');
    end if;

    -- 5) Seed drawers & photos (guarded to avoid double-triggering quota accounting)
    if not exists (select 1 from public.drawers where id = v_drawer1_id) then
        insert into public.drawers (id, owner_id, name, description)
        values (v_drawer1_id, v_user1_id, 'Đà Lạt 2026', 'Chuyến đi mùa xuân');
    end if;

    if not exists (select 1 from public.drawers where id = v_drawer2_id) then
        insert into public.drawers (id, owner_id, name, description)
        values (v_drawer2_id, v_user2_id, 'Sài Gòn cuối tuần', 'Ảnh kỷ niệm bạn bè');
    end if;

    if not exists (select 1 from public.photos where id = v_photo1_id) then
        insert into public.photos (id, drawer_id, uploaded_by, original_url, thumbnail_url, file_size_bytes, width, height)
        values (v_photo1_id, v_drawer1_id, v_user1_id, 'https://placehold.co/1200x1600/png?text=Slot+1', 'https://placehold.co/480x640/png?text=Slot+1', 420000, 1200, 1600);
    end if;

    if not exists (select 1 from public.photos where id = v_photo2_id) then
        insert into public.photos (id, drawer_id, uploaded_by, original_url, thumbnail_url, file_size_bytes, width, height)
        values (v_photo2_id, v_drawer1_id, v_user1_id, 'https://placehold.co/1200x1600/png?text=Slot+2', 'https://placehold.co/480x640/png?text=Slot+2', 410000, 1200, 1600);
    end if;

    if not exists (select 1 from public.photos where id = v_photo3_id) then
        insert into public.photos (id, drawer_id, uploaded_by, original_url, thumbnail_url, file_size_bytes, width, height)
        values (v_photo3_id, v_drawer2_id, v_user2_id, 'https://placehold.co/1200x1600/png?text=Slot+3', 'https://placehold.co/480x640/png?text=Slot+3', 390000, 1200, 1600);
    end if;

    if not exists (select 1 from public.photos where id = v_photo4_id) then
        insert into public.photos (id, drawer_id, uploaded_by, original_url, thumbnail_url, file_size_bytes, width, height)
        values (v_photo4_id, v_drawer2_id, v_user2_id, 'https://placehold.co/1200x1600/png?text=Private+Only', 'https://placehold.co/480x640/png?text=Private+Only', 350000, 1200, 1600);
    end if;

    -- 6) Seed photobooth items & slot photos
    select id into v_tpl_classic from public.photobooth_templates where name = 'Classic White' limit 1;
    select id into v_tpl_vintage from public.photobooth_templates where name = 'Vintage Memories' limit 1;
    select id into v_tpl_gold from public.photobooth_templates where name = 'Premium Gold' limit 1;

    if v_tpl_classic is not null and not exists (select 1 from public.photobooth_items where id = v_item1_id) then
        insert into public.photobooth_items (id, user_id, template_id, preview_url, status)
        values (v_item1_id, v_user1_id, v_tpl_classic, 'https://placehold.co/600x900/png?text=Preview+1', 'ordered');

        insert into public.photobooth_photos (photobooth_item_id, photo_id, slot_index)
        values
            (v_item1_id, v_photo1_id, 0),
            (v_item1_id, v_photo2_id, 1)
        on conflict do nothing;
    end if;

    if v_tpl_gold is not null and not exists (select 1 from public.photobooth_items where id = v_item2_id) then
        insert into public.photobooth_items (id, user_id, template_id, preview_url, status)
        values (v_item2_id, v_user1_id, v_tpl_gold, 'https://placehold.co/600x900/png?text=Preview+2', 'ordered');

        insert into public.photobooth_photos (photobooth_item_id, photo_id, slot_index)
        values
            (v_item2_id, v_photo1_id, 0),
            (v_item2_id, v_photo2_id, 1)
        on conflict do nothing;
    end if;

    if v_tpl_vintage is not null and not exists (select 1 from public.photobooth_items where id = v_item3_id) then
        insert into public.photobooth_items (id, user_id, template_id, preview_url, status)
        values (v_item3_id, v_user2_id, v_tpl_vintage, 'https://placehold.co/600x900/png?text=Preview+3', 'ordered');

        insert into public.photobooth_photos (photobooth_item_id, photo_id, slot_index)
        values
            (v_item3_id, v_photo3_id, 0)
        on conflict do nothing;
    end if;

    -- 7) Seed 6 print orders across all 6 statuses
    if v_tpl_classic is not null then
        if not exists (select 1 from public.print_orders where id = v_order1_id) then
            insert into public.print_orders (
                id, user_id, photobooth_item_id, quantity, unit_price_vnd, total_price_vnd,
                shipping_name, shipping_phone, shipping_address, cover_type, paper_type, status, created_at
            ) values (
                v_order1_id, v_user2_id, v_item3_id, 1, 35000, 35000,
                'Hoàng Minh', '0901000003', '123 Lê Lợi, Q.1, TP.HCM', 'soft', 'standard', 'pending', now() - interval '2 hours'
            );
        end if;

        if not exists (select 1 from public.print_orders where id = v_order2_id) then
            insert into public.print_orders (
                id, user_id, photobooth_item_id, quantity, unit_price_vnd, total_price_vnd,
                shipping_name, shipping_phone, shipping_address, cover_type, paper_type, status, admin_notes, created_at
            ) values (
                v_order2_id, v_user1_id, v_item1_id, 2, 45000, 90000,
                'Ngọc Linh', '0901000002', '45 Nguyễn Huệ, Q.1, TP.HCM', 'hard', 'premium', 'processing', 'Khách đã thanh toán PayOS', now() - interval '1 day'
            );
        end if;

        if not exists (select 1 from public.print_orders where id = v_order3_id) then
            insert into public.print_orders (
                id, user_id, photobooth_item_id, quantity, unit_price_vnd, total_price_vnd,
                shipping_name, shipping_phone, shipping_address, cover_type, paper_type, status, created_at
            ) values (
                v_order3_id, v_user1_id, v_item2_id, 1, 55000, 55000,
                'Ngọc Linh', '0901000002', '45 Nguyễn Huệ, Q.1, TP.HCM', 'hard', 'premium', 'printing', now() - interval '2 days'
            );
        end if;

        if not exists (select 1 from public.print_orders where id = v_order4_id) then
            insert into public.print_orders (
                id, user_id, photobooth_item_id, quantity, unit_price_vnd, total_price_vnd,
                shipping_name, shipping_phone, shipping_address, cover_type, paper_type, status, created_at
            ) values (
                v_order4_id, v_user1_id, v_item1_id, 1, 35000, 35000,
                'Ngọc Linh', '0901000002', '45 Nguyễn Huệ, Q.1, TP.HCM', 'soft', 'standard', 'shipping', now() - interval '3 days'
            );
        end if;

        if not exists (select 1 from public.print_orders where id = v_order5_id) then
            insert into public.print_orders (
                id, user_id, photobooth_item_id, quantity, unit_price_vnd, total_price_vnd,
                shipping_name, shipping_phone, shipping_address, cover_type, paper_type, status, created_at
            ) values (
                v_order5_id, v_user1_id, v_item2_id, 3, 45000, 135000,
                'Ngọc Linh', '0901000002', '45 Nguyễn Huệ, Q.1, TP.HCM', 'hard', 'premium', 'completed', now() - interval '7 days'
            );
        end if;

        if not exists (select 1 from public.print_orders where id = v_order6_id) then
            insert into public.print_orders (
                id, user_id, photobooth_item_id, quantity, unit_price_vnd, total_price_vnd,
                shipping_name, shipping_phone, shipping_address, cover_type, paper_type, status, admin_notes, created_at
            ) values (
                v_order6_id, v_user2_id, v_item3_id, 1, 35000, 35000,
                'Hoàng Minh', '0901000003', '123 Lê Lợi, Q.1, TP.HCM', 'soft', 'standard', 'cancelled', 'Khách đổi địa chỉ và đặt lại đơn mới', now() - interval '4 days'
            );
        end if;
    end if;

    -- 8) Seed sample transactions across types & statuses
    if not exists (select 1 from public.transactions where id = v_tx1_id) then
        insert into public.transactions (id, user_id, membership_id, type, amount_vnd, payment_method, payment_gateway_ref, order_code, status, metadata, created_at)
        values (
            v_tx1_id, v_user1_id, v_mem1_id, 'membership', 55000, 'vietqr_payos', 'PAYOS_MEM_9001', 900000001, 'success',
            '{"payment_type":"pause_plus","plan":"PAUSE Plus"}'::jsonb, now() - interval '15 days'
        );
    end if;

    if not exists (select 1 from public.transactions where id = v_tx2_id) then
        insert into public.transactions (id, user_id, order_id, type, amount_vnd, payment_method, payment_gateway_ref, order_code, status, metadata, created_at)
        values (
            v_tx2_id, v_user1_id, v_order2_id, 'print_order', 90000, 'vietqr_payos', 'PAYOS_ORD_9002', 900000002, 'success',
            jsonb_build_object('payment_type', 'print_order', 'ref_id', v_order2_id), now() - interval '1 day'
        );
    end if;

    if not exists (select 1 from public.transactions where id = v_tx3_id) then
        insert into public.transactions (id, user_id, order_id, type, amount_vnd, payment_method, payment_gateway_ref, order_code, status, metadata, created_at)
        values (
            v_tx3_id, v_user1_id, v_order5_id, 'print_order', 135000, 'vietqr_payos', 'PAYOS_ORD_9003', 900000003, 'success',
            jsonb_build_object('payment_type', 'print_order', 'ref_id', v_order5_id), now() - interval '7 days'
        );
    end if;

    if not exists (select 1 from public.transactions where id = v_tx4_id) then
        insert into public.transactions (id, user_id, order_id, type, amount_vnd, payment_method, payment_gateway_ref, order_code, status, metadata, created_at)
        values (
            v_tx4_id, v_user2_id, v_order1_id, 'print_order', 35000, 'vietqr_payos', 'PAYOS_ORD_9004', 900000004, 'pending',
            jsonb_build_object('payment_type', 'print_order', 'ref_id', v_order1_id), now() - interval '2 hours'
        );
    end if;

    if not exists (select 1 from public.transactions where id = v_tx5_id) then
        insert into public.transactions (id, user_id, order_id, type, amount_vnd, payment_method, payment_gateway_ref, order_code, status, metadata, created_at)
        values (
            v_tx5_id, v_user2_id, v_order6_id, 'print_order', 35000, 'vietqr_payos', 'PAYOS_ORD_9005', 900000005, 'failed',
            jsonb_build_object('payment_type', 'print_order', 'ref_id', v_order6_id, 'reason', 'expired_qr'), now() - interval '4 days'
        );
    end if;

    if not exists (select 1 from public.transactions where id = v_tx6_id) then
        insert into public.transactions (id, user_id, order_id, type, amount_vnd, payment_method, payment_gateway_ref, order_code, status, metadata, created_at)
        values (
            v_tx6_id, v_user2_id, v_order6_id, 'print_order', 35000, 'vietqr_payos', 'PAYOS_REFUND_9006', 900000006, 'refunded',
            jsonb_build_object('payment_type', 'print_order', 'ref_id', v_order6_id, 'refund_reason', 'cancelled_order'), now() - interval '3 days'
        );
    end if;
end $$;
