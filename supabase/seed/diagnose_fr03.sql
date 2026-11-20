-- =============================================================================
-- FR-03 diagnostics – chạy trong SQL Editor, gửi lại toàn bộ output nếu app vẫn
-- báo "Không tải được mẫu in".
-- =============================================================================

-- 1) Bảng templates có tồn tại + các cột hiện có?
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'photobooth_templates'
order by ordinal_position;

-- 2) RLS + policies
select relrowsecurity from pg_class where relname = 'photobooth_templates';
select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public' and tablename = 'photobooth_templates';

-- 3) Số dòng thực tế (SQL Editor chạy bằng postgres nên bỏ qua RLS)
select count(*) as templates, count(*) filter (where is_active) as active
from public.photobooth_templates;

select name, category, slot_count, is_premium, is_active
from public.photobooth_templates order by name;

-- 4) Các bảng FR-03 khác có tồn tại?
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('photobooth_templates','photobooth_items','photobooth_photos','print_orders')
order by table_name;

-- 5) Cột product options của print_orders
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'print_orders'
  and column_name in ('cover_type','paper_type');

-- 6) Thử query y như app (PostgREST cần quyền read; chạy ở đây là postgres nên
--    chỉ kiểm tra cú pháp/cột, không kiểm tra RLS của user)
select id, name, category, preview_url, slot_count, is_premium, is_active,
       layout_config is not null as has_layout
from public.photobooth_templates
where is_active
limit 5;
