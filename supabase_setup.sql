-- =====================================================
-- Supabase セットアップSQL（認証あり・初回用）
-- Supabase Dashboard > SQL Editor に貼り付けて実行
-- =====================================================

-- 1. damages テーブル
create table if not exists damages (
  id          uuid primary key default gen_random_uuid(),
  floor       text not null,
  location    text not null,
  remarks     text default '',
  is_done     boolean not null default false,
  is_deleted  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. damage_images テーブル（写真は複数枚）
create table if not exists damage_images (
  id           uuid primary key default gen_random_uuid(),
  damage_id    uuid not null references damages(id) on delete cascade,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

-- 3. インデックス
create index if not exists damage_images_damage_id_idx on damage_images(damage_id);

-- 4. RLS 有効化
alter table damages enable row level security;
alter table damage_images enable row level security;

-- 5. ポリシー（認証済みユーザーのみ）
create policy "auth users only damages"
  on damages for all
  to authenticated
  using (true)
  with check (true);

create policy "auth users only damage_images"
  on damage_images for all
  to authenticated
  using (true)
  with check (true);

-- 6. Storage バケット作成
insert into storage.buckets (id, name, public)
values ('damage-images', 'damage-images', true)
on conflict (id) do nothing;

-- 7. Storage ポリシー（認証済みユーザーのみ）
create policy "auth users only storage"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'damage-images')
  with check (bucket_id = 'damage-images');
