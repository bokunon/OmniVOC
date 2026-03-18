import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createOctokit, createIssue } from "@/lib/github";
import { appendNextActions } from "@/lib/issue-template";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { feedback_ids, repo_full_name, title, issue_body } = body;

  if (
    !Array.isArray(feedback_ids) ||
    feedback_ids.length === 0 ||
    !repo_full_name ||
    !title
  ) {
    return NextResponse.json(
      { error: "feedback_ids, repo_full_name, and title are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // フィードバック一覧を取得
  const { data: feedbacks, error: fetchError } = await supabase
    .from("feedbacks")
    .select("id, content")
    .in("id", feedback_ids);

  if (fetchError || !feedbacks || feedbacks.length === 0) {
    return NextResponse.json(
      { error: "Feedbacks not found" },
      { status: 404 }
    );
  }

  // Issue 本文を構築
  const feedbackSummary = feedbacks
    .map((f, i) => `${i + 1}. ${f.content}`)
    .join("\n");

  const finalBody = appendNextActions(
    issue_body || `## ユーザーフィードバック\n\n${feedbackSummary}`
  );

  // GitHub Issue を作成
  const octokit = await createOctokit();
  const issue = await createIssue(octokit, repo_full_name, title, finalBody);

  // 全フィードバックを紐付け
  const linkInserts = feedbacks.map((f) => ({
    feedback_id: f.id,
    issue_url: issue.url,
    issue_number: issue.number,
    repo_full_name,
  }));
  await supabase.from("feedback_issues").insert(linkInserts);

  // 全フィードバックのステータスを更新
  const now = new Date().toISOString();
  await supabase
    .from("feedbacks")
    .update({
      status: "ticketed",
      reviewed: true,
      reviewed_at: now,
      updated_at: now,
    })
    .in("id", feedback_ids);

  return NextResponse.json({
    issue_url: issue.url,
    issue_number: issue.number,
    updated_count: feedbacks.length,
  });
}
