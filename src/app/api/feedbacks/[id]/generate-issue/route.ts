import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: feedback, error } = await supabase
    .from("feedbacks")
    .select("content, channel, source_url, projects(display_name)")
    .eq("id", id)
    .single();

  if (error || !feedback) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // AI なしのフォールバック
    return NextResponse.json({
      title: feedback.content.slice(0, 60),
      body: `## ユーザーフィードバック\n\n${feedback.content}\n\n---\nチャネル: ${feedback.channel}${feedback.source_url ? `\nURL: ${feedback.source_url}` : ""}`,
    });
  }

  const anthropic = new Anthropic({ apiKey });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectRaw = feedback.projects as any;
  const project = Array.isArray(projectRaw) ? projectRaw[0] : projectRaw;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `以下のユーザーフィードバックから GitHub Issue のタイトルと本文を生成してください。

## フィードバック
"${feedback.content}"

## コンテキスト
- プロジェクト: ${project?.display_name ?? "不明"}
- チャネル: ${feedback.channel}${feedback.source_url ? `\n- 送信元URL: ${feedback.source_url}` : ""}

## 回答フォーマット (JSON のみ)
{
  "title": "簡潔な Issue タイトル（70文字以内）",
  "body": "Markdown 形式の Issue 本文（元のフィードバック内容を含める）"
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
      title: feedback.content.slice(0, 60),
      body: `## ユーザーフィードバック\n\n${feedback.content}`,
    });
  }
}
