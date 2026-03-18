const BUG_INVESTIGATION = `
---

## 🔍 調査依頼（Claude Code へ）

このバグについて以下を調査・整理し、結果をユーザーに確認してください：

- [ ] 原因の調査（コード・ログ・DB 等を確認）
- [ ] 対策案の提示（修正方法・パッチ内容）
- [ ] 影響範囲の確認（他機能・データへの影響）
`;

const FEATURE_NEXT_ACTIONS = `
---

## ✅ ネクストアクション

- [ ] 内容を確認して \`approved\` ラベルを付ける
- [ ] Claude Code に \`#Issue番号 実装して\` と指示する
- [ ] ステージング環境で動作確認する
- [ ] Claude Code に \`#Issue番号 main に出して\` と指示して本番デプロイ
`;

export function appendNextActions(body: string, feedbackType: string = "feature"): string {
  const block = feedbackType === "bug" ? BUG_INVESTIGATION : FEATURE_NEXT_ACTIONS;
  return body + block;
}
