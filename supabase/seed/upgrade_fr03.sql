-- =============================================================================
-- FR-03 upgrade (fault tolerant) – chạy trong Supabase Dashboard → SQL Editor.
--
-- Mỗi bước nằm trong DO block có exception handler, nên nếu 1 bước lỗi
-- (cột/bảng chưa có, policy trùng...) thì các bước còn lại VẪN chạy.
-- Chạy lại nhiều lần không lỗi.
--
-- Bước 5 `notify pgrst, 'reload schema'` rất quan trọng: nếu DB vừa được thêm
-- cột mà PostgREST chưa reload cache, app sẽ vẫn báo lỗi dù cột đã tồn tại.
--
-- Nếu sau khi chạy app vẫn báo lỗi: chạy `supabase/seed/diagnose_fr03.sql`.
-- =============================================================================

-- 1) Bổ sung cột còn thiếu cho photobooth_templates -------------------------
do $$ begin
    alter table public.photobooth_templates add column if not exists category text not null default 'general';
exception when others then raise notice 'skip templates.category: %', sqlerrm; end $$;

do $$ begin
    alter table public.photobooth_templates add column if not exists is_active boolean not null default true;
exception when others then raise notice 'skip templates.is_active: %', sqlerrm; end $$;

do $$ begin
    alter table public.photobooth_templates add column if not exists is_premium boolean not null default false;
exception when others then raise notice 'skip templates.is_premium: %', sqlerrm; end $$;

do $$ begin
    alter table public.photobooth_templates add column if not exists layout_config jsonb not null default '{}'::jsonb;
exception when others then raise notice 'skip templates.layout_config: %', sqlerrm; end $$;

-- 2) Bổ sung cột product options cho print_orders ---------------------------
do $$ begin
    alter table public.print_orders add column if not exists cover_type text not null default 'soft';
exception when others then raise notice 'skip orders.cover_type: %', sqlerrm; end $$;

do $$ begin
    alter table public.print_orders add column if not exists paper_type text not null default 'standard';
exception when others then raise notice 'skip orders.paper_type: %', sqlerrm; end $$;

-- 3) Unique constraint + RLS policy cho templates ---------------------------
do $$ begin
    if not exists (select 1 from pg_constraint where conname = 'photobooth_templates_name_key') then
        alter table public.photobooth_templates add constraint photobooth_templates_name_key unique (name);
    end if;
exception when others then raise notice 'skip unique name: %', sqlerrm; end $$;

do $$ begin
    alter table public.photobooth_templates enable row level security;
exception when others then raise notice 'skip enable rls: %', sqlerrm; end $$;

do $$ begin
    drop policy if exists "Active templates are readable by everyone" on public.photobooth_templates;
    create policy "Active templates are readable by everyone"
        on public.photobooth_templates for select
        to authenticated, anon
        using (is_active);
exception when others then raise notice 'skip template policy: %', sqlerrm; end $$;

-- 4) Seed 6 template (dynamic SQL để không chết nếu thiếu cột lạ) -----------
do $$
declare
    has_category boolean;
    has_active boolean;
    has_premium boolean;
    has_layout boolean;
    extra_cols text := '';
    extra_vals text := '';
begin
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name='photobooth_templates' and column_name='category') into has_category;
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name='photobooth_templates' and column_name='is_active') into has_active;
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name='photobooth_templates' and column_name='is_premium') into has_premium;
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name='photobooth_templates' and column_name='layout_config') into has_layout;

    if has_category then extra_cols := extra_cols || ', category'; end if;
    if has_active then extra_cols := extra_cols || ', is_active'; end if;
    if has_premium then extra_cols := extra_cols || ', is_premium'; end if;
    if has_layout then extra_cols := extra_cols || ', layout_config'; end if;

    create temp table if not exists _fr03_seed (
        name text, category text, preview_url text, slot_count int,
        is_premium boolean, is_active boolean, layout_config jsonb
    ) on commit drop;
    truncate _fr03_seed;

    insert into _fr03_seed values
    ('Classic White','couple','https://placehold.co/600x900/png?text=Classic+White',2,false,true,
     '{"width":1200,"height":1800,"background_color":"#FFFFFF","slots":[{"index":0,"x":60,"y":120,"width":1080,"height":700},{"index":1,"x":60,"y":900,"width":1080,"height":700}],"texts":[{"content":"Pause","x":600,"y":1700,"font_size":48,"color":"#111111"}],"frame_url":null}'::jsonb),
    ('Vintage Memories','friends','https://placehold.co/600x900/png?text=Vintage',4,false,true,
     '{"width":1200,"height":1800,"background_color":"#F6EFE4","slots":[{"index":0,"x":60,"y":90,"width":520,"height":390},{"index":1,"x":620,"y":90,"width":520,"height":390},{"index":2,"x":60,"y":510,"width":520,"height":390},{"index":3,"x":620,"y":510,"width":520,"height":390}],"texts":[{"content":"Vintage Memories","x":600,"y":1700,"font_size":52,"color":"#5B4636"}],"frame_url":null}'::jsonb),
    ('Minimal Strip','general','https://placehold.co/600x900/png?text=Minimal',3,false,true,
     '{"width":1200,"height":1800,"background_color":"#FFFFFF","slots":[{"index":0,"x":100,"y":100,"width":1000,"height":440},{"index":1,"x":100,"y":600,"width":1000,"height":440},{"index":2,"x":100,"y":1100,"width":1000,"height":440}],"texts":[{"content":"pause.","x":600,"y":1720,"font_size":40,"color":"#111111"}],"frame_url":null}'::jsonb),
    ('Pastel Grid','friends','https://placehold.co/600x900/png?text=Pastel',4,false,true,
     '{"width":1200,"height":1800,"background_color":"#FDE8EF","slots":[{"index":0,"x":60,"y":80,"width":520,"height":640},{"index":1,"x":620,"y":80,"width":520,"height":640},{"index":2,"x":60,"y":760,"width":520,"height":640},{"index":3,"x":620,"y":760,"width":520,"height":640}],"texts":[],"frame_url":null}'::jsonb),
    ('Family Portrait','family','https://placehold.co/600x900/png?text=Family',1,false,true,
     '{"width":1200,"height":1200,"background_color":"#F1F1F1","slots":[{"index":0,"x":100,"y":100,"width":1000,"height":1000}],"texts":[{"content":"Gia đình","x":600,"y":1150,"font_size":44,"color":"#111111"}],"frame_url":null}'::jsonb),
    ('Premium Gold','couple','https://placehold.co/600x900/png?text=Premium',4,true,true,
     '{"width":1200,"height":1800,"background_color":"#111111","slots":[{"index":0,"x":60,"y":80,"width":520,"height":620},{"index":1,"x":620,"y":80,"width":520,"height":620},{"index":2,"x":60,"y":740,"width":520,"height":620},{"index":3,"x":620,"y":740,"width":520,"height":620}],"texts":[{"content":"PAUSE GOLD","x":600,"y":1700,"font_size":56,"color":"#D4AF37"}],"frame_url":null}'::jsonb);

    if has_category then extra_vals := extra_vals || ', category'; end if;
    if has_active then extra_vals := extra_vals || ', is_active'; end if;
    if has_premium then extra_vals := extra_vals || ', is_premium'; end if;
    if has_layout then extra_vals := extra_vals || ', layout_config'; end if;

    execute format(
        'insert into public.photobooth_templates (name, preview_url, slot_count%1$s)
         select name, preview_url, slot_count%2$s from _fr03_seed
         on conflict (name) do nothing',
        extra_cols, extra_vals
    );
exception when others then
    raise notice 'seed failed: %', sqlerrm;
end $$;

-- 5) Reload PostgREST schema cache -----------------------------------------
notify pgrst, 'reload schema';

-- Kiểm tra: phải thấy 6 template, is_active = true
select name, category, slot_count, is_premium, is_active
from public.photobooth_templates
order by name;
