# OmniVOC - データモデル

## テーブル設計

### projects

OmniVOC に登録されたプロジェクト。フィードバックの送信元を識別する。

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | `uuid` PK | |
| `project_key` | `text` NOT NULL UNIQUE | API キー兼識別子（例: `pretalk`） |
| `display_name` | `text` NOT NULL | ダッシュボード上の表示名 |
| `repo_full_name` | `text` | デフォルトのチケット化先 `owner/repo`（任意） |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

### feedbacks

フィードバックの本体テーブル。

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | `uuid` PK | |
| `project_id` | `uuid` FK → projects.id NOT NULL | どのプロジェクトから来たか |
| `channel` | `text` NOT NULL | チャネル種別: `web` / `slack` / `line` / その他 |
| `content` | `text` NOT NULL | フィードバック本文 |
| `status` | `text` NOT NULL DEFAULT `'auto_new'` | ステータス（下記参照） |
| `ai_confidence` | `real` | AI 判定の信頼度スコア（0.0〜1.0） |
| `ai_reason` | `text` | AI 判定の理由テキスト |
| `suggested_issue_url` | `text` | AI が提案した紐付け先 Issue URL |
| `reviewed` | `boolean` NOT NULL DEFAULT `false` | 管理者が確認済みか |
| `reviewed_at` | `timestamptz` | 確認日時 |
| `sender_id` | `text` | チャネル固有の送信者 ID（Slack user ID, LINE user ID 等） |
| `sender_name` | `text` | 表示名（取得可能な場合） |
| `metadata` | `jsonb` | チャネル固有の追加情報 |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

### ステータス一覧

| ステータス | 意味 | 設定者 |
|-----------|------|--------|
| `auto_new` | AI 判定: 新規トピック | AI |
| `auto_linked` | AI 判定: 既存 open Issue に類似 | AI |
| `auto_resolved` | AI 判定: 対応済み closed Issue と同一 | AI |
| `ticketed` | 確認済み・チケット化済み | 管理者 |
| `resolved` | 確認済み・対応不要 | 管理者 |

### feedback_issues

フィードバックと GitHub Issue の紐付けテーブル（多対多）。

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | `uuid` PK | |
| `feedback_id` | `uuid` FK → feedbacks.id | |
| `issue_url` | `text` NOT NULL | GitHub Issue の URL |
| `issue_number` | `integer` NOT NULL | Issue 番号 |
| `repo_full_name` | `text` NOT NULL | `owner/repo` 形式 |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

## ER 図

```
projects ──── 1:N ──── feedbacks ──── N:M ──── GitHub Issues (外部)
                          │                        │
                          │ AI 判定結果             │
                          │ ・ai_confidence    (feedback_issues)
                          │ ・ai_reason
                          │ ・suggested_issue_url
                          │
                          │ 管理者確認
                          │ ・reviewed
                          │ ・reviewed_at
```

## API リクエスト例

```json
POST /api/feedback
{
  "project_key": "pretalk",
  "channel": "slack",
  "content": "もっとこうして欲しい",
  "sender_id": "U1234567",
  "sender_name": "田中"
}
```

### レスポンス例

```json
201 Created
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "auto_linked",
  "ai_confidence": 0.87,
  "ai_reason": "既存 Issue #42「UIの改善要望」と類似",
  "suggested_issue_url": "https://github.com/bokunon/pretalk/issues/42"
}
```

## インデックス

- `projects`: `(project_key)` UNIQUE
- `feedbacks`: `(project_id, status)`, `(project_id, reviewed)`, `(created_at DESC)`
- `feedback_issues`: `(feedback_id)`, `(issue_url)`
