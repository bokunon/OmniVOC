import { cookies } from "next/headers";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

const SESSION_COOKIE = "omnivoc_session";
const SECRET = process.env.SESSION_SECRET || "fallback-secret";

function getKey() {
  return createHash("sha256").update(SECRET).digest();
}

export async function setSession(data: { github_token: string; github_user: string; github_avatar: string }) {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const json = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const value = iv.toString("hex") + ":" + encrypted.toString("hex");

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getSession(): Promise<{ github_token: string; github_user: string; github_avatar: string } | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;

  try {
    const [ivHex, encHex] = value.split(":");
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encHex, "hex");
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
