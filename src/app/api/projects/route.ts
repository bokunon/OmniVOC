import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { display_name, repo_full_name } = body;

  if (!display_name) {
    return NextResponse.json(
      { error: "display_name is required" },
      { status: 400 }
    );
  }

  const project_key = randomBytes(16).toString("hex");

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      project_key,
      display_name,
      repo_full_name: repo_full_name ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
