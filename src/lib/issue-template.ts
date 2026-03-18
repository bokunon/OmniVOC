const NEXT_ACTIONS = `
---

## ネクストアクション

- [ ] 内容を確認して \`approved\` ラベルを付ける
- [ ] Claude Code に \`#Issue番号 実装して\` と指示する
- [ ] ステージング環境で動作確認する
- [ ] Claude Code に \`#Issue番号 main に出して\` と指示して本番デプロイ
`;

export function appendNextActions(body: string): string {
  return body + NEXT_ACTIONS;
}
