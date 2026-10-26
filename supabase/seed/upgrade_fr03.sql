-- =============================================================================
-- FR-03 upgrade cho DB đã tạo trước khi có seed/columns (chạy 1 lần trong
-- Supabase Dashboard → SQL Editor). Idempotent: chạy lại không lỗi.
--
-- Nội dung:
--   1) thêm cột product options cho print_orders (cover_type, paper_type)
--   2) đảm bảo unique constraint cho photobooth_templates.name
--   3) đảm bảo RLS + policy cho phép đọc template đang active
--   4) seed 6 template photobooth kèm layout_config
-- =============================================================================

-- 0) đảm bảo các cột FR-03 tồn tại (DB được tạo từ migration cũ) ------------
alter table public.photobooth_templates add column if not exists category text not null default 'general';
alter table public.photobooth_templates add column if not exists is_active boolean not null default true;
alter table public.photobooth_templates add column if not exists is_premium boolean not null default false;
alter table public.photobooth_templates add column if not exists layout_config jsonb not null default '{}'::jsonb;
alter table public.photobooth_items add column if not exists preview_url text;

-- 1) product options (Figma: Custom & Print) ---------------------------------
alter table public.print_orders
    add column if not exists cover_type text not null default 'soft';
alter table public.print_orders
    add column if not exists paper_type text not null default 'standard';

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'print_orders_cover_type_check'
    ) then
        alter table public.print_orders
            add constraint print_orders_cover_type_check check (cover_type in ('soft', 'hard'));
    end if;
    if not exists (
        select 1 from pg_constraint where conname = 'print_orders_paper_type_check'
    ) then
        alter table public.print_orders
            add constraint print_orders_paper_type_check check (paper_type in ('standard', 'premium'));
    end if;
end $$;

-- 2) unique template name (needed for idempotent seeding) --------------------
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'photobooth_templates_name_key'
    ) then
        alter table public.photobooth_templates
            add constraint photobooth_templates_name_key unique (name);
    end if;
end $$;

-- 3) RLS + read policy -------------------------------------------------------
alter table public.photobooth_templates enable row level security;

drop policy if exists "Active templates are readable by everyone" on public.photobooth_templates;
create policy "Active templates are readable by everyone"
    on public.photobooth_templates for select
    to authenticated, anon
    using (is_active);

-- 4) seed templates ----------------------------------------------------------
insert into public.photobooth_templates (name, category, preview_url, slot_count, is_premium, layout_config)
values
    ('Classic White', 'couple',
     'https://placehold.co/600x900/png?text=Classic+White', 2, false,
     '{"width":1200,"height":1800,"background_color":"#FFFFFF","slots":[
        {"index":0,"x":60,"y":120,"width":1080,"height":700},
        {"index":1,"x":60,"y":900,"width":1080,"height":700}],
        "texts":[{"content":"Pause","x":600,"y":1700,"font_size":48,"color":"#111111"}],
        "frame_url":null}'::jsonb),
    ('Vintage Memories', 'friends',
     'https://placehold.co/600x900/png?text=Vintage', 4, false,
     '{"width":1200,"height":1800,"background_color":"#F6EFE4","slots":[
        {"index":0,"x":60,"y":90,"width":520,"height":390},
        {"index":1,"x":620,"y":90,"width":520,"height":390},
        {"index":2,"x":60,"y":510,"width":520,"height":390},
        {"index":3,"x":620,"y":510,"width":520,"height":390}],
        "texts":[{"content":"Vintage Memories","x":600,"y":1700,"font_size":52,"color":"#5B4636"}],
        "frame_url":null}'::jsonb),
    ('Minimal Strip', 'general',
     'https://placehold.co/600x900/png?text=Minimal', 3, false,
     '{"width":1200,"height":1800,"background_color":"#FFFFFF","slots":[
        {"index":0,"x":100,"y":100,"width":1000,"height":440},
        {"index":1,"x":100,"y":600,"width":1000,"height":440},
        {"index":2,"x":100,"y":1100,"width":1000,"height":440}],
        "texts":[{"content":"pause.","x":600,"y":1720,"font_size":40,"color":"#111111"}],
        "frame_url":null}'::jsonb),
    ('Pastel Grid', 'friends',
     'https://placehold.co/600x900/png?text=Pastel', 4, false,
     '{"width":1200,"height":1800,"background_color":"#FDE8EF","slots":[
        {"index":0,"x":60,"y":80,"width":520,"height":640},
        {"index":1,"x":620,"y":80,"width":520,"height":640},
        {"index":2,"x":60,"y":760,"width":520,"height":640},
        {"index":3,"x":620,"y":760,"width":520,"height":640}],
        "texts":[],
        "frame_url":null}'::jsonb),
    ('Family Portrait', 'family',
     'https://placehold.co/600x900/png?text=Family', 1, false,
     '{"width":1200,"height":1200,"background_color":"#F1F1F1","slots":[
        {"index":0,"x":100,"y":100,"width":1000,"height":1000}],
        "texts":[{"content":"Gia đình","x":600,"y":1150,"font_size":44,"color":"#111111"}],
        "frame_url":null}'::jsonb),
    ('Premium Gold', 'couple',
     'https://placehold.co/600x900/png?text=Premium', 4, true,
     '{"width":1200,"height":1800,"background_color":"#111111","slots":[
        {"index":0,"x":60,"y":80,"width":520,"height":620},
        {"index":1,"x":620,"y":80,"width":520,"height":620},
        {"index":2,"x":60,"y":740,"width":520,"height":620},
        {"index":3,"x":620,"y":740,"width":520,"height":620}],
        "texts":[{"content":"PAUSE GOLD","x":600,"y":1700,"font_size":56,"color":"#D4AF37"}],
        "frame_url":null}'::jsonb)
on conflict (name) do nothing;

-- Kiểm tra: phải trả về 6 dòng
select name, category, slot_count, is_premium from public.photobooth_templates order by name;
