# OmniVOC - データモデル（V1）

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
| `status` | `text` NOT NULL DEFAULT `'new'` | `new` / `ticketed` / `resolved` |
| `sender_id` | `text` | チャネル固有の送信者 ID（Slack user ID, LINE user ID 等） |
| `sender_name` | `text` | 表示名（取得可能な場合） |
| `metadata` | `jsonb` | チャネル固有の追加情報 |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

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
                                      │
                                (feedback_issues)
```

## API リクエスト例

```json
POST /api/feedback
{
  "project_key": "pretalk",    // → projects.project_key で検索 → project_id
  "channel": "slack",
  "content": "もっとこうして欲しい",
  "sender_id": "U1234567",
  "sender_name": "田中"
}
```

## インデックス

- `projects`: `(project_key)` UNIQUE
- `feedbacks`: `(project_id, status)`, `(project_id, channel)`, `(created_at DESC)`
- `feedback_issues`: `(feedback_id)`, `(issue_url)`
