import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createOctokit } from "@/lib/github";
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

  if (!repo_full_name) {
    return NextResponse.json(
      { error: "repo_full_name is required" },
      { status: 400 }
    );
  }

  // GitHub API で認証・権限チェック
  try {
    const octokit = createOctokit();
    const [owner, repo] = repo_full_name.split("/");
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });

    // Issue 作成権限チェック（has_issues が有効 + push 権限以上）
    if (!repoData.has_issues) {
      return NextResponse.json(
        { error: "This repository has Issues disabled" },
        { status: 400 }
      );
    }

    const finalDisplayName = display_name || repoData.name;
    const project_key = randomBytes(16).toString("hex");

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({
        project_key,
        display_name: finalDisplayName,
        repo_full_name,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error:
          "Failed to access repository. Check if the repository exists and GITHUB_TOKEN has access.",
      },
      { status: 400 }
    );
  }
}
