import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ project_key: string; feedback_id: string }> }
) {
  const { feedback_id } = await params;
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("board_comments")
    .select("id, author_name, content, created_at")
    .eq("feedback_id", feedback_id)
    .order("created_at", { ascending: true });

  return NextResponse.json(data || [], { headers: corsHeaders });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ project_key: string; feedback_id: string }> }
) {
  const { feedback_id } = await params;
  const body = await request.json();
  const { content, author_name } = body;

  if (!content) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400, headers: corsHeaders }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("board_comments")
    .insert({
      feedback_id,
      content,
      author_name: author_name || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }

  return NextResponse.json(data, { status: 201, headers: corsHeaders });
}
