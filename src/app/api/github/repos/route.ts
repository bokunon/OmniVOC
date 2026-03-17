import { NextRequest, NextResponse } from "next/server";
import { createOctokit } from "@/lib/github";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repoFullName = searchParams.get("repo");

  if (!repoFullName || !repoFullName.includes("/")) {
    return NextResponse.json(
      { error: "repo parameter is required (format: owner/repo)" },
      { status: 400 }
    );
  }

  try {
    const octokit = createOctokit();
    const [owner, repo] = repoFullName.split("/");
    const { data } = await octokit.rest.repos.get({ owner, repo });

    return NextResponse.json({
      name: data.name,
      full_name: data.full_name,
      description: data.description,
      private: data.private,
      has_issues: data.has_issues,
    });
  } catch {
    return NextResponse.json(
      { error: "Repository not found or no access" },
      { status: 404 }
    );
  }
}
