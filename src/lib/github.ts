import { Octokit } from "octokit";
import { getSession } from "./session";

export function createOctokitWithToken(token: string) {
  return new Octokit({ auth: token });
}

export async function createOctokit() {
  // OAuth トークンを優先、なければ固定トークンにフォールバック
  const session = await getSession();
  const token = session?.github_token || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Not authenticated. Please login with GitHub.");
  }
  return new Octokit({ auth: token });
}

export async function fetchOpenIssues(
  octokit: Octokit,
  repoFullName: string
): Promise<{ number: number; title: string; body: string; url: string; state: string }[]> {
  const [owner, repo] = repoFullName.split("/");
  const { data } = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    state: "all",
    per_page: 100,
    sort: "updated",
    direction: "desc",
  });
  return data
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      body: i.body ?? "",
      url: i.html_url,
      state: i.state,
    }));
}

export async function createIssue(
  octokit: Octokit,
  repoFullName: string,
  title: string,
  body: string
): Promise<{ number: number; url: string }> {
  const [owner, repo] = repoFullName.split("/");
  const { data } = await octokit.rest.issues.create({
    owner,
    repo,
    title,
    body,
  });
  return { number: data.number, url: data.html_url };
}
