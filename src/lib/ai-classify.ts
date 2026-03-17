import Anthropic from "@anthropic-ai/sdk";
import { createOctokit, fetchOpenIssues } from "./github";

interface ClassificationResult {
  status: "auto_new" | "auto_linked" | "auto_resolved";
  ai_confidence: number;
  ai_reason: string;
  suggested_issue_url: string | null;
}

export async function classifyFeedback(
  content: string,
  repoFullName: string | null
): Promise<ClassificationResult> {
  if (!repoFullName) {
    return {
      status: "auto_new",
      ai_confidence: 1.0,
      ai_reason: "プロジェクトにリポジトリが未設定のため新規として分類",
      suggested_issue_url: null,
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      status: "auto_new",
      ai_confidence: 1.0,
      ai_reason: "AI API キーが未設定のため新規として分類",
      suggested_issue_url: null,
    };
  }

  const octokit = await createOctokit();
  const issues = await fetchOpenIssues(octokit, repoFullName);

  if (issues.length === 0) {
    return {
      status: "auto_new",
      ai_confidence: 1.0,
      ai_reason: "既存 Issue がないため新規として分類",
      suggested_issue_url: null,
    };
  }

  const issueList = issues
    .map(
      (i) =>
        `- #${i.number} [${i.state}] ${i.title}\n  ${i.body.slice(0, 200)}`
    )
    .join("\n");

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `あなたはフィードバック分類アシスタントです。

以下のユーザーフィードバックを、既存の GitHub Issue リストと照合し、JSON で回答してください。

## フィードバック
"${content}"

## 既存 Issue リスト
${issueList}

## 回答フォーマット (JSON のみ、他のテキストは含めないでください)
{
  "status": "auto_linked" | "auto_resolved" | "auto_new",
  "confidence": 0.0〜1.0,
  "reason": "判定理由（日本語）",
  "matched_issue_number": null | 数字
}

## ルール
- フィードバックの内容が open の Issue と類似している → "auto_linked"、その Issue 番号を matched_issue_number に
- フィードバックの内容が closed の Issue と同一/類似 → "auto_resolved"、その Issue 番号を matched_issue_number に
- どの Issue にも該当しない → "auto_new"、matched_issue_number は null
- confidence は判定の確信度（0.0〜1.0）`,
      },
    ],
  });

  try {
    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const result = JSON.parse(jsonMatch[0]);
    const matchedIssue = result.matched_issue_number
      ? issues.find((i) => i.number === result.matched_issue_number)
      : null;

    return {
      status: result.status,
      ai_confidence: result.confidence,
      ai_reason: result.reason,
      suggested_issue_url: matchedIssue?.url ?? null,
    };
  } catch {
    return {
      status: "auto_new",
      ai_confidence: 0.5,
      ai_reason: "AI 判定のパースに失敗したため新規として分類",
      suggested_issue_url: null,
    };
  }
}
