import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createOctokit, createIssue } from "@/lib/github";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { repo_full_name, title, issue_body } = body;

  if (!repo_full_name || !title) {
    return NextResponse.json(
      { error: "repo_full_name and title are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: feedback, error: fetchError } = await supabase
    .from("feedbacks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !feedback) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  // GitHub Issue を作成
  const octokit = await createOctokit();
  const issue = await createIssue(
    octokit,
    repo_full_name,
    title,
    issue_body || feedback.content
  );

  // feedback_issues に紐付けを記録
  await supabase.from("feedback_issues").insert({
    feedback_id: id,
    issue_url: issue.url,
    issue_number: issue.number,
    repo_full_name,
  });

  // ステータスを ticketed に更新
  await supabase
    .from("feedbacks")
    .update({
      status: "ticketed",
      reviewed: true,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({
    id,
    status: "ticketed",
    issue_url: issue.url,
    issue_number: issue.number,
  });
}
