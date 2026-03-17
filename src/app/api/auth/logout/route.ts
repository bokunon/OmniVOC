import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export async function POST(_request: NextRequest) {
  await clearSession();
  return NextResponse.json({ ok: true });
}
