import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    console.error("[OAuth] GitHub returned error:", error);
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    console.error("[OAuth] Missing GITHUB_OAUTH_CLIENT_ID or GITHUB_OAUTH_CLIENT_SECRET");
    return NextResponse.redirect(
      new URL("/dashboard?error=oauth_not_configured", request.url)
    );
  }

  // Exchange code for token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const tokenData = await tokenRes.json();

  if (tokenData.error || !tokenData.access_token) {
    console.error("[OAuth] Token exchange failed:", JSON.stringify(tokenData));
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=${encodeURIComponent(tokenData.error_description || tokenData.error || "auth_failed")}`,
        request.url
      )
    );
  }

  // Get user info
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = await userRes.json();

  await setSession({
    github_token: tokenData.access_token,
    github_user: userData.login,
    github_avatar: userData.avatar_url || "",
  });

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
