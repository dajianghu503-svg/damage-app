-- =====================================================
-- Supabase セットアップSQL
-- Supabase Dashboard > SQL Editor に貼り付けて実行
-- =====================================================

-- 1. damages テーブル
create table if not exists damages (
  id          uuid primary key default gen_random_uuid(),
  floor       text not null,
  location    text not null,
  remarks     text default '',
  is_done     boolean not null default false,
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

-- 4. RLS（Row Level Security）を有効化
alter table damages enable row level security;
alter table damage_images enable row level security;

-- 5. ポリシー設定（認証なしで全員読み書き可 ← 社内限定なら認証追加を推奨）
create policy "allow all damages" on damages for all using (true) with check (true);
create policy "allow all damage_images" on damage_images for all using (true) with check (true);

-- =====================================================
-- Storage バケット設定
-- Supabase Dashboard > Storage > New Bucket
-- =====================================================
-- バケット名: damage-images
-- Public: ON（公開URL で画像表示するため）
-- ※ Dashboard から手動作成してください

-- Storage ポリシー（SQL Editor で実行）
insert into storage.buckets (id, name, public)
values ('damage-images', 'damage-images', true)
on conflict (id) do nothing;

create policy "allow all storage" on storage.objects
  for all using (bucket_id = 'damage-images')
  with check (bucket_id = 'damage-images');
