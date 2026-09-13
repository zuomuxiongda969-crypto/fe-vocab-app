-- 基本情報技術者試験 単語帳アプリ用スキーマ
-- Supabaseダッシュボードの SQL Editor に貼り付けて実行する

create extension if not exists pgcrypto;

create table if not exists words (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  term_yomi text,
  category text,
  meaning text,
  analogy text,
  illustration_url text,
  created_at timestamptz default now()
);

-- 個人利用の単発アプリのため、anonキーに対して全操作を許可するシンプルなポリシーにする。
-- 注意: このURL/anonキーを知っていれば誰でも読み書きできる構成。公開リポジトリに
-- service role keyを絶対に含めないこと（anonキーのみクライアントに置く）。
alter table words enable row level security;

create policy "allow all select for anon" on words
  for select using (true);

create policy "allow all insert for anon" on words
  for insert with check (true);

create policy "allow all update for anon" on words
  for update using (true);

create policy "allow all delete for anon" on words
  for delete using (true);

-- イラスト画像用のストレージバケット
insert into storage.buckets (id, name, public)
values ('illustrations', 'illustrations', true)
on conflict (id) do nothing;

create policy "public read illustrations" on storage.objects
  for select using (bucket_id = 'illustrations');

create policy "service role write illustrations" on storage.objects
  for insert with check (bucket_id = 'illustrations');
