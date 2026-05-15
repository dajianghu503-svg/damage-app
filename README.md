# 施設傷情報共有ツール

スマホ・PCで動作する施設の傷情報共有ウェブアプリ。  
写真・場所・対応状況を記録・共有できます。

## 技術スタック

- フロント: React + Vite（PWA対応）
- ルーティング: React Router v6
- バックエンド / DB: Supabase (PostgreSQL + Storage + Auth)
- ホスティング: Netlify（GitHubと連携、pushで自動デプロイ）

---

## 初回セットアップ

### 1. Supabase プロジェクト作成

1. https://supabase.com でプロジェクト作成
2. **SQL Editor** に `supabase_setup.sql` を貼り付けて実行
   - テーブル・Storage バケット・RLS ポリシーが一括作成されます
3. **Settings > API** から以下を控える
   - Project URL
   - Publishable (anon) key

### 2. ユーザーを作成

**Authentication > Users > Add user** からログインユーザーを登録します。

| 項目 | 入力値 |
|------|--------|
| Email | `{使わせたいID}@dummy.com` |
| Password | 任意のパスワード |

例：IDを `yamada` にしたい場合 → Email を `yamada@dummy.com` で登録。  
ログイン画面では `yamada` と入力するだけで認証されます。

### 3. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を編集して値を入力：

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
```

> `.env.local` は `.gitignore` で除外済みです。絶対にコミットしないでください。

### 4. Netlify の環境変数を設定

Netlify Dashboard > **Site configuration > Environment variables** に同じ2つを追加してから再デプロイ。

### 5. ローカル起動（確認用）

```bash
npm install
npm run dev
```

---

## ユーザー管理

### ユーザー追加

**Authentication > Users > Add user**

| 項目 | 入力値 |
|------|--------|
| Email | `{ID}@dummy.com` |
| Password | 任意のパスワード |

### ユーザー削除・パスワード変更

**Authentication > Users** から直接編集・削除してください。

---

## 画面構成

| パス | 画面 | 主な機能 |
|------|------|----------|
| `/` | 一覧 | 階数フィルター・対応済フィルター・ソート切替（階数／登録順／更新順）・フィルター状態保持 |
| `/detail/:id` | 詳細 | 写真フルスクリーン・ピンチズーム・対応状況・備考・削除（論理削除） |
| `/register` | 新規登録 | 写真複数枚・カメラ／ギャラリー／ファイル選択・備考・対応済チェック |
| `/edit/:id` | 編集 | 登録内容の修正・写真の追加削除 |

---

## データ構造

### damages テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid | PK |
| floor | text | 階数（RF / 39F〜01F / B1F） |
| location | text | 場所 |
| remarks | text | 備考 |
| is_done | boolean | 対応済フラグ |
| is_deleted | boolean | 削除フラグ（論理削除） |
| created_at | timestamptz | 登録日時 |
| updated_at | timestamptz | 更新日時 |

### damage_images テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid | PK |
| damage_id | uuid | damages.id FK（cascade delete） |
| storage_path | text | Supabase Storage 内のパス |
| created_at | timestamptz | 登録日時 |

### Storage

バケット名: `damage-images`（Public）  
パス形式: `{damage_id}/{timestamp}_{random}.jpg`

---

## 削除されたデータの確認・復元

削除は論理削除（`is_deleted = true`）のため、データは残っています。  
Supabase Dashboard > **Table Editor > damages** から直接確認・復元できます。

復元する場合は該当レコードの `is_deleted` を `false` に戻してください。
