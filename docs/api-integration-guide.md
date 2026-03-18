# OmniVOC 連携ガイド（API 仕様書）

OmniVOC はユーザーの声（VOC）を収集・管理するプロダクトです。
各プロダクト側の実装はスクリプトタグ 1 行から始められます。

---

## 目次

1. [プロジェクトキーの取得](#1-プロジェクトキーの取得)
2. [フィードバックウィジェット（埋め込み JS）](#2-フィードバックウィジェット埋め込み-js)
3. [フィードバックボード（掲示板）](#3-フィードバックボード掲示板)
4. [フィードバック送信 API（直接 POST）](#4-フィードバック送信-api直接-post)
5. [data-mode によるモード制御](#5-data-mode-によるモード制御)
6. [多言語対応](#6-多言語対応)

---

## 1. プロジェクトキーの取得

OmniVOC ダッシュボード（`https://omnivoc-nu.vercel.app/dashboard`）にアクセスし、プロジェクトを登録してください。

- 登録時に GitHub リポジトリと紐付けます
- 登録完了後、`project_key`（例: `my-app`）が発行されます
- この `project_key` を埋め込みタグや API コールに使います

---

## 2. フィードバックウィジェット（埋め込み JS）

画面右下にフローティングフォームを表示します。ユーザーがその場で入力・送信できます。

### 基本の埋め込み

```html
<script
  src="https://omnivoc-nu.vercel.app/widget.js"
  data-project-key="YOUR_PROJECT_KEY"
></script>
```

### オプション一覧

| 属性 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `data-project-key` | ✅ | — | プロジェクトキー |
| `data-mode` | — | `all` | `bug` / `feature` / `all` |
| `data-lang` | — | `ja` | `ja` / `en` |
| `data-message` | — | — | フォームのプレースホルダーをカスタマイズ |

### 使用例

```html
<!-- バグ報告専用ウィジェット（英語） -->
<script
  src="https://omnivoc-nu.vercel.app/widget.js"
  data-project-key="my-app"
  data-mode="bug"
  data-lang="en"
></script>

<!-- 要望受付ウィジェット（カスタムメッセージ） -->
<script
  src="https://omnivoc-nu.vercel.app/widget.js"
  data-project-key="my-app"
  data-mode="feature"
  data-message="新しい機能を提案する"
></script>
```

### 動作

- **PC**: 画面右下にテキストエリアが常時表示。クリックで展開・送信
- **モバイル**: ボタンをタップするとパネルが展開
- 送信元 URL（`window.location.href`）が自動的に記録されます

---

## 3. フィードバックボード（掲示板）

ユーザーが投稿一覧を見て、投票・コメントできる掲示板です。

### 方法 A: ページ型（専用 URL）

OmniVOC がホストするページをそのまま使います。

```
https://omnivoc-nu.vercel.app/board/YOUR_PROJECT_KEY
```

**クエリパラメータ**

| パラメータ | デフォルト | 説明 |
|-----------|-----------|------|
| `lang` | `ja` | `ja` / `en` |
| `mode` | `all` | `bug` / `feature` / `all` |

```
# 例: 要望ボード（英語）
https://omnivoc-nu.vercel.app/board/my-app?mode=feature&lang=en
```

### 方法 B: 埋め込み型（自サイトに設置）

自サイトの任意のページに掲示板を埋め込めます。

```html
<script
  src="https://omnivoc-nu.vercel.app/board.js"
  data-project-key="YOUR_PROJECT_KEY"
></script>
```

スクリプトタグの直後に掲示板 UI が挿入されます。

**オプション一覧**

| 属性 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `data-project-key` | ✅ | — | プロジェクトキー |
| `data-mode` | — | `all` | `bug` / `feature` / `all` |
| `data-lang` | — | `ja` | `ja` / `en` |

```html
<!-- 要望ボードのみ（バグは表示しない） -->
<script
  src="https://omnivoc-nu.vercel.app/board.js"
  data-project-key="my-app"
  data-mode="feature"
></script>
```

### 掲示板の機能

| 機能 | bug | feature |
|------|-----|---------|
| 一覧表示 | ✅ | ✅ |
| 投票 | ✅ | ✅ |
| コメント | ❌ | ✅ |
| 直接投稿フォーム | ✅ | ✅ |

---

## 4. フィードバック送信 API（直接 POST）

Slack Bot、LINE Bot、独自 UI など、JS ウィジェット以外から送信したい場合に使います。

### エンドポイント

```
POST https://omnivoc-nu.vercel.app/api/feedback
Content-Type: application/json
```

### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `project_key` | string | ✅ | プロジェクトキー |
| `channel` | string | ✅ | 送信元チャネル（`web` / `slack` / `line` / `board` など自由記述） |
| `content` | string | ✅ | フィードバック本文 |
| `feedback_type` | string | — | `bug` / `feature` / `other`（デフォルト: `feature`） |
| `source_url` | string | — | 送信元ページの URL |
| `sender_id` | string | — | 送信者の識別子（Slack user ID など） |
| `sender_name` | string | — | 送信者名 |
| `metadata` | object | — | チャネル固有の追加情報（任意の JSON） |

### リクエスト例

```bash
curl -X POST https://omnivoc-nu.vercel.app/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "project_key": "my-app",
    "channel": "slack",
    "content": "検索結果の表示が遅い気がします",
    "feedback_type": "bug",
    "source_url": "https://my-app.example.com/search",
    "sender_id": "U12345678",
    "sender_name": "田中 太郎"
  }'
```

### レスポンス

```json
// 201 Created
{
  "id": "uuid",
  "status": "auto_new",
  "message": "Feedback received. AI classification in progress."
}
```

### エラー

| ステータス | 説明 |
|-----------|------|
| `400` | `project_key` / `channel` / `content` のいずれかが未指定 |
| `404` | `project_key` が存在しない |
| `500` | サーバーエラー |

---

## 5. data-mode によるモード制御

`data-mode` を指定することで、プロダクト側がウィジェット・掲示板の用途を絞れます。

| data-mode | 送信される feedback_type | 掲示板の表示 | コメント |
|-----------|------------------------|------------|---------|
| `all`（デフォルト） | `feature` | 全件 | feature のみ |
| `bug` | `bug` | bug のみ | なし |
| `feature` | `feature` | feature のみ | あり |

**ユースケース例:**
- サポートページ → `data-mode="bug"` でバグ報告に特化
- ロードマップページ → `data-mode="feature"` で要望・投票のみ

---

## 6. 多言語対応

`data-lang` 属性（ウィジェット・掲示板）または `?lang=` クエリパラメータ（ページ型）で切り替えます。

| 値 | 言語 |
|----|------|
| `ja`（デフォルト） | 日本語 |
| `en` | 英語 |

言語が指定されない場合、`<html lang="...">` の値が自動参照されます。

---

## CORS について

フィードバック送信 API（`/api/feedback`）および掲示板 API（`/api/board/*`）は、クロスオリジンリクエストを許可しています（`Access-Control-Allow-Origin: *`）。
埋め込み先ドメインの制限は特にありません。

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0 | 2026-03-18 | 初版作成 |
