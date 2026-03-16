# OmniVOC - プロダクト概要

## コンセプト

ユーザーの声（Voice of Customer）を **複数チャネルから収集**し、**集約・分析**した上で **GitHub Issue としてチケット化**するプロダクト。

## 設計思想

**OmniVOC 自体は Bot を持たない。** 各プロダクトの既存チャネル（Slack Bot、LINE Bot 等）が OmniVOC の API にフィードバックを転送する。

OmniVOC が提供するのは:
- **フィードバック受付 API**（全チャネル共通エンドポイント）
- **Web ウィジェット**（API を叩く薄い埋め込み JS。Bot を持たない Web プロダクト向け）
- **管理ダッシュボード**（集約・チケット化）
- **GitHub Issue 連携**

## アーキテクチャ

```
[プロダクト A]                    [プロダクト B]
  Web に <script> 埋め込み          Slack Bot (既存) が転送
       │                                │
       │    [プロダクト C]               │
       │      LINE Bot (既存) が転送     │
       │           │                     │
       ▼           ▼                     ▼
    ┌──────────────────────────────────────┐
    │     POST /api/feedback               │
    │     (共通 API エンドポイント)          │
    ├──────────────────────────────────────┤
    │           Supabase DB                │
    ├──────────────────────────────────────┤
    │         管理ダッシュボード             │
    ├──────────────────────────────────────┤
    │        GitHub Issue 連携             │
    └──────────────────────────────────────┘
```

## チャネル別の導入方法

| チャネル | 導入方法 | OmniVOC 側の実装 |
|---------|---------|-----------------|
| Web | `<script>` タグ 1 行埋め込み | ウィジェット JS を配布 |
| Slack | 各プロダクトの既存 Bot から API を叩く | なし（API のみ） |
| LINE | 各プロダクトの既存 Bot から API を叩く | なし（API のみ） |
| その他 | 各プロダクトから API を叩く | なし（API のみ） |

### 各プロダクトへの導入手順

```
1. OmniVOC ダッシュボードでプロジェクトを登録
   → project_key が発行される（例: "pretalk"）

2-a. Web プロダクトの場合:
     <script src="https://omnivoc.vercel.app/widget.js"
             data-project-key="pretalk"></script>

2-b. Slack / LINE / その他の場合:
     既存 Bot のコード内でフィードバック検出時に API を叩く:
     POST https://omnivoc.vercel.app/api/feedback
     {
       "project_key": "pretalk",
       "channel": "slack",
       "content": "もっとこうして欲しい",
       "sender_id": "U1234567",
       "sender_name": "田中"
     }
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド（ダッシュボード） | Next.js (App Router) |
| フロントエンド（ウィジェット） | 埋め込み用 JS |
| バックエンド API | Next.js API Routes |
| データベース | Supabase (PostgreSQL) |
| ホスティング | Vercel |
| チケット連携 | GitHub API (Octokit) |
