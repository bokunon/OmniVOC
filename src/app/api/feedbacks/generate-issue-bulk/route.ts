import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { feedback_ids } = body;

  if (!Array.isArray(feedback_ids) || feedback_ids.length === 0) {
    return NextResponse.json(
      { error: "feedback_ids is required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: feedbacks, error } = await supabase
    .from("feedbacks")
    .select("id, content, channel, source_url, projects(display_name)")
    .in("id", feedback_ids);

  if (error || !feedbacks || feedbacks.length === 0) {
    return NextResponse.json(
      { error: "Feedbacks not found" },
      { status: 404 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const feedbackSummary = feedbacks
    .map((f, i) => `${i + 1}. ${f.content}`)
    .join("\n");

  if (!apiKey) {
    return NextResponse.json({
      title: `ユーザーフィードバック (${feedbacks.length}件)`,
      body: `## ユーザーフィードバック\n\n${feedbackSummary}`,
    });
  }

  const anthropic = new Anthropic({ apiKey });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectRaw = feedbacks[0].projects as any;
  const project = Array.isArray(projectRaw) ? projectRaw[0] : projectRaw;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `以下の複数のユーザーフィードバックから、共通テーマを抽出して 1 つの GitHub Issue のタイトルと本文を生成してください。

## フィードバック (${feedbacks.length}件)
${feedbackSummary}

## コンテキスト
- プロジェクト: ${project?.display_name ?? "不明"}

## 回答フォーマット (JSON のみ)
{
  "title": "共通テーマを要約した Issue タイトル（70文字以内）",
  "body": "Markdown 形式の Issue 本文（個別のフィードバックをリストで含める）"
}`,
      },
    ],
  });

  try {
    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      title: `ユーザーフィードバック (${feedbacks.length}件)`,
      body: `## ユーザーフィードバック\n\n${feedbackSummary}`,
    });
  }
}
