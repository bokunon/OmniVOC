import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { classifyFeedback } from "@/lib/ai-classify";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { project_key, channel, content, sender_id, sender_name, metadata } =
    body;

  if (!project_key || !channel || !content) {
    return NextResponse.json(
      { error: "project_key, channel, content are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // project_key でプロジェクトを検索
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, repo_full_name")
    .eq("project_key", project_key)
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: `Project not found: ${project_key}` },
      { status: 404 }
    );
  }

  // フィードバックを保存（まず auto_new で保存）
  const { data: feedback, error: insertError } = await supabase
    .from("feedbacks")
    .insert({
      project_id: project.id,
      channel,
      content,
      status: "auto_new",
      sender_id: sender_id ?? null,
      sender_name: sender_name ?? null,
      metadata: metadata ?? null,
    })
    .select("id")
    .single();

  if (insertError || !feedback) {
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }

  // AI 分類を非同期で実行（レスポンスは先に返す）
  classifyFeedback(content, project.repo_full_name)
    .then(async (classification) => {
      await supabase
        .from("feedbacks")
        .update({
          status: classification.status,
          ai_confidence: classification.ai_confidence,
          ai_reason: classification.ai_reason,
          suggested_issue_url: classification.suggested_issue_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", feedback.id);
    })
    .catch(async () => {
      // AI 分類失敗時は auto_new のまま
      await supabase
        .from("feedbacks")
        .update({
          ai_reason: "AI 分類処理でエラーが発生",
          updated_at: new Date().toISOString(),
        })
        .eq("id", feedback.id);
    });

  return NextResponse.json(
    {
      id: feedback.id,
      status: "auto_new",
      message: "Feedback received. AI classification in progress.",
    },
    { status: 201 }
  );
}
