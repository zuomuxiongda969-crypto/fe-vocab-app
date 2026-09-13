# 基本情報技術者試験 単語帳

基本情報技術者試験の学習用個人単語帳PWA。用語・読み方・分野・意味・身近な例え・AI生成イラストを登録し、検索できる。

## 構成
- フロントエンド: 素のHTML/CSS/JS（ビルド不要）、PWA化済み
- ホスティング: GitHub Pages
- バックエンド: Supabase（Postgres + Storage + Edge Functions）
- 提案・イラスト生成: OpenAI API（Edge Functions経由で呼び出し、キーはサーバー側のみに保持）

## セットアップ手順

### 1. Supabaseプロジェクト作成
1. https://supabase.com でアカウント作成 → 新規プロジェクト作成
2. プロジェクトの `SQL Editor` を開き、`supabase/schema.sql` の内容を貼り付けて実行
3. `Project Settings > API` から以下を控える
   - Project URL
   - anon public key
   - service role key（Edge Functionsでのみ使用。フロントには絶対に置かない）

### 2. フロントエンドの設定
`config.js` の値を、控えたProject URL / anon keyに書き換える。

```js
export const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
export const SUPABASE_ANON_KEY = "xxxxxxxx";
```

### 3. Supabase CLIの導入とEdge Functionsのデプロイ
```bash
brew install supabase/tap/supabase
supabase login
cd fe-vocab-app
supabase link --project-ref <プロジェクトのref>
supabase secrets set OPENAI_API_KEY=sk-xxxxxxxx
supabase functions deploy generate-illustration
supabase functions deploy assist-word
```
OpenAIのAPIキーは https://platform.openai.com で発行する（従量課金）。

### 4. ローカルで確認
```bash
cd fe-vocab-app
python3 -m http.server 8000
```
ブラウザで `http://localhost:8000` を開き、単語の追加・検索・AI提案・イラスト生成を確認する。

### 5. GitHub Pagesで公開
```bash
gh repo create fe-vocab-app --private --source=. --remote=origin
git add .
git commit -m "Initial commit"
git push -u origin main
```
GitHubリポジトリの `Settings > Pages` で `main` ブランチをソースに指定して公開する。
公開されたURLをスマートフォンのブラウザで開き、共有メニューから「ホーム画面に追加」するとアプリのように使える。

## 日常の使い方
- 単語を追加するのはPCでもスマホでもOK（同じSupabaseに保存されるので両方に反映される）
- コード自体を修正した場合のみ、`git push` すればGitHub Pagesに数分で反映される
- 単語データの追加・編集はアプリ内操作だけで完結し、pushは不要

## セキュリティ上の注意
このアプリは個人利用の単発ツールとして、認証なし・anonキーで全操作を許可する構成にしている。
URLとanonキーを知っていれば誰でも読み書きできるため、他人に公開しないこと。
