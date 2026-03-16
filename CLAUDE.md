# OmniVOC - プロジェクト固有設定

## プロジェクト概要

ユーザーの声（Voice of Customer）を複数チャネルから収集し、集約・チケット化するプロダクト。
OmniVOC 自体は Bot を持たず、各プロダクトの既存チャネル（Slack Bot / LINE Bot 等）から API 経由でフィードバックを受け取る。Web 向けには埋め込みウィジェットを提供する。

## 技術スタック

- **フレームワーク**: Next.js (App Router)
- **DB**: Supabase (PostgreSQL)
- **ホスティング**: Vercel
- **チケット連携**: GitHub API (Octokit)

## プロジェクト構成

```
/
├── docs/                    # ドキュメント
│   ├── product-overview.md  # プロダクト概要・アーキテクチャ
│   ├── user-stories.md      # ユーザーストーリー
│   ├── feedback-flow.md     # フィードバック処理フロー
│   └── data-model.md        # データモデル
├── src/
│   └── app/
│       ├── api/
│       │   └── feedback/    # フィードバック受付 API（全チャネル共通）
│       └── dashboard/       # 管理ダッシュボード
├── public/
│   └── widget.js            # 埋め込みウィジェット JS
└── CLAUDE.md                # このファイル
```

## 開発標準

`~/.claude/standards/` の共通開発標準に準拠。

- DB 操作: `~/.claude/standards/supabase.md`
- デプロイ: `~/.claude/standards/vercel.md`
- 本番品質: `~/.claude/standards/production-checklist.md`

## 環境変数

`.env` に設定（`.gitignore` 済み）:

```
# Supabase
SUPABASE_ACCESS_TOKEN=
SUPABASE_PROJECT_REF=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DIRECT_DATABASE_URL=

# Vercel
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=

# GitHub (チケット連携用)
GITHUB_TOKEN=
```
