import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ project_key: string }> }
) {
  const { project_key } = await params;
  const typeFilter = request.nextUrl.searchParams.get("type"); // "bug" | "feature" | null
  const supabase = createServiceClient();

  // プロジェクト確認
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("project_key", project_key)
    .single();

  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404, headers: corsHeaders }
    );
  }

  // 全フィードバックを取得（ステータス問わず即時表示）
  let query = supabase
    .from("feedbacks")
    .select("id, content, source_url, created_at, feedback_type, feedback_issues(issue_url, issue_number)")
    .eq("project_id", project.id);
  if (typeFilter === "bug" || typeFilter === "feature") {
    query = query.eq("feedback_type", typeFilter);
  }
  const { data: feedbacks } = await query.order("created_at", { ascending: false });

  if (!feedbacks || feedbacks.length === 0) {
    return NextResponse.json([], { headers: corsHeaders });
  }

  // 各フィードバックの投票数とコメント数を取得
  const feedbackIds = feedbacks.map((f) => f.id);

  const { data: voteCounts } = await supabase
    .from("board_votes")
    .select("feedback_id")
    .in("feedback_id", feedbackIds);

  const { data: commentCounts } = await supabase
    .from("board_comments")
    .select("feedback_id")
    .in("feedback_id", feedbackIds);

  const voteMap: Record<string, number> = {};
  const commentMap: Record<string, number> = {};
  voteCounts?.forEach((v) => {
    voteMap[v.feedback_id] = (voteMap[v.feedback_id] || 0) + 1;
  });
  commentCounts?.forEach((c) => {
    commentMap[c.feedback_id] = (commentMap[c.feedback_id] || 0) + 1;
  });

  const result = feedbacks
    .map((f) => ({
      id: f.id,
      content: f.content,
      source_url: f.source_url,
      created_at: f.created_at,
      feedback_type: f.feedback_type,
      issue_url: f.feedback_issues?.[0]?.issue_url ?? null,
      issue_number: f.feedback_issues?.[0]?.issue_number ?? null,
      votes: voteMap[f.id] || 0,
      comments: commentMap[f.id] || 0,
    }))
    .sort((a, b) => b.votes - a.votes);

  return NextResponse.json(result, { headers: corsHeaders });
}
