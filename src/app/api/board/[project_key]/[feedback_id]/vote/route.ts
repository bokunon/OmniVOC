import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ project_key: string; feedback_id: string }> }
) {
  const { feedback_id } = await params;
  const body = await request.json();
  const { voter_id } = body;

  if (!voter_id) {
    return NextResponse.json(
      { error: "voter_id is required" },
      { status: 400, headers: corsHeaders }
    );
  }

  const supabase = createServiceClient();

  // 既存の投票を確認
  const { data: existing } = await supabase
    .from("board_votes")
    .select("id")
    .eq("feedback_id", feedback_id)
    .eq("voter_id", voter_id)
    .single();

  if (existing) {
    // 取消
    await supabase.from("board_votes").delete().eq("id", existing.id);
    return NextResponse.json({ voted: false }, { headers: corsHeaders });
  } else {
    // 投票
    await supabase
      .from("board_votes")
      .insert({ feedback_id, voter_id });
    return NextResponse.json({ voted: true }, { headers: corsHeaders });
  }
}
