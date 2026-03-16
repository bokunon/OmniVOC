# OmniVOC - プロダクト概要

## コンセプト

ユーザーの声（Voice of Customer）を **複数チャネルから収集**し、**集約・分析**した上で **GitHub Issue としてチケット化**するプロダクト。

## アーキテクチャ

```
[Web Widget]  [Slack Bot]  [LINE Bot]  [将来追加チャネル]
      │            │            │              │
      └────────────┴────────────┴──────────────┘
                         │
                   [Next.js API Routes]
                         │
                    [Supabase DB]
                         │
                  [管理ダッシュボード]
                         │
                  [GitHub Issue 連携]
```

### 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド（ダッシュボード） | Next.js (App Router) |
| フロントエンド（ウィジェット） | 埋め込み用 JS + iframe |
| バックエンド API | Next.js API Routes |
| データベース | Supabase (PostgreSQL) |
| ホスティング | Vercel |
| チケット連携 | GitHub API (`gh` / Octokit) |

### チャネル別ホスティング

| チャネル | 受け口 | SDK |
|---------|--------|-----|
| Web Widget | `/api/feedback` | - |
| Slack Bot | `/api/slack/events` (Webhook) | `@slack/bolt` |
| LINE Bot | `/api/line/webhook` (Webhook) | `@line/bot-sdk` |

Slack / LINE ともに Webhook ベースのため、Vercel API Routes で完結。別サーバー不要。
