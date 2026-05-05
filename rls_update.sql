-- =====================================================
-- RLS ポリシー更新SQL（認証済みユーザーのみアクセス可）
-- Supabase Dashboard > SQL Editor に貼り付けて実行
-- =====================================================

-- 既存の全開放ポリシーを削除
drop policy if exists "allow all damages" on damages;
drop policy if exists "allow all damage_images" on damage_images;
drop policy if exists "allow all storage" on storage.objects;

-- damages: 認証済みユーザーのみ全操作可
create policy "auth users only damages"
  on damages for all
  to authenticated
  using (true)
  with check (true);

-- damage_images: 認証済みユーザーのみ全操作可
create policy "auth users only damage_images"
  on damage_images for all
  to authenticated
  using (true)
  with check (true);

-- storage: 認証済みユーザーのみ全操作可
create policy "auth users only storage"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'damage-images')
  with check (bucket_id = 'damage-images');

-- =====================================================
-- ユーザー追加方法
-- Supabase Dashboard > Authentication > Users > Add user
-- メールアドレスとパスワードを設定してください
-- =====================================================
