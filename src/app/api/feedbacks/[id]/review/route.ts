import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action, issue_url } = body;
  // action: "approve" | "reject" | "relink"
  // issue_url: 修正時の新しい Issue URL（relink 時）

  const supabase = createServiceClient();

  // 現在のフィードバックを取得
  const { data: feedback, error: fetchError } = await supabase
    .from("feedbacks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !feedback) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  let newStatus: string;

  switch (action) {
    case "approve":
      if (feedback.status === "auto_linked") {
        newStatus = "ticketed";
        // 紐付けを feedback_issues に記録
        if (feedback.suggested_issue_url) {
          const urlMatch = feedback.suggested_issue_url.match(
            /github\.com\/([^/]+\/[^/]+)\/issues\/(\d+)/
          );
          if (urlMatch) {
            await supabase.from("feedback_issues").insert({
              feedback_id: id,
              issue_url: feedback.suggested_issue_url,
              issue_number: parseInt(urlMatch[2]),
              repo_full_name: urlMatch[1],
            });
          }
        }
      } else if (feedback.status === "auto_resolved") {
        newStatus = "resolved";
      } else {
        newStatus = feedback.status;
      }
      break;

    case "reject":
      // AI 判定を棄却 → auto_new に戻す
      newStatus = "auto_new";
      break;

    case "relink":
      // 別の Issue に紐付け直す
      newStatus = "ticketed";
      if (issue_url) {
        const urlMatch = issue_url.match(
          /github\.com\/([^/]+\/[^/]+)\/issues\/(\d+)/
        );
        if (urlMatch) {
          await supabase.from("feedback_issues").insert({
            feedback_id: id,
            issue_url,
            issue_number: parseInt(urlMatch[2]),
            repo_full_name: urlMatch[1],
          });
        }
      }
      break;

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("feedbacks")
    .update({
      status: newStatus,
      reviewed: true,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ id, status: newStatus, reviewed: true });
}
