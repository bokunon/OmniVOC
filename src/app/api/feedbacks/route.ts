import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const status = searchParams.get("status");
  const channel = searchParams.get("channel");
  const reviewed = searchParams.get("reviewed");

  const supabase = createServiceClient();
  let query = supabase
    .from("feedbacks")
    .select("*, projects(display_name, project_key, repo_full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (projectId) query = query.eq("project_id", projectId);
  if (status) query = query.eq("status", status);
  if (channel) query = query.eq("channel", channel);
  if (reviewed !== null && reviewed !== undefined) {
    query = query.eq("reviewed", reviewed === "true");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
