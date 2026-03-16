# OmniVOC - データモデル（V1）

## テーブル設計

### feedbacks

フィードバックの本体テーブル。

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | `uuid` PK | |
| `channel` | `text` NOT NULL | チャネル種別: `web` / `slack` / `line` |
| `content` | `text` NOT NULL | フィードバック本文 |
| `status` | `text` NOT NULL DEFAULT `'new'` | `new` / `ticketed` / `resolved` |
| `sender_id` | `text` | チャネル固有の送信者 ID（Slack user ID, LINE user ID 等） |
| `sender_name` | `text` | 表示名（取得可能な場合） |
| `metadata` | `jsonb` | チャネル固有の追加情報（Slack: channel, ts / LINE: replyToken 等） |
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

### projects

管理対象の GitHub リポジトリ。チケット化先の選択肢。

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | `uuid` PK | |
| `repo_full_name` | `text` NOT NULL UNIQUE | `owner/repo` 形式 |
| `display_name` | `text` | ダッシュボード上の表示名 |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

## ER 図

```
feedbacks ──┐
            │ N:M (via feedback_issues)
            ├──→ feedback_issues ──→ GitHub Issues (外部)
            │
projects ───┘ (チケット化先の選択肢)
```

## インデックス

- `feedbacks`: `(status)`, `(channel)`, `(created_at DESC)`
- `feedback_issues`: `(feedback_id)`, `(issue_url)`
- `projects`: `(repo_full_name)` UNIQUE
