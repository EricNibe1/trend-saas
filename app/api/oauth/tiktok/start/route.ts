import { NextResponse } from "next/server";
import crypto from "crypto";

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sha256(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "Missing org_id" }, { status: 400 });

  // CSRF state
  const nonce = crypto.randomBytes(16).toString("hex");
  const state = `${nonce}|${orgId}`;

  // PKCE
  const codeVerifier = base64url(crypto.randomBytes(32)); // random string
  const codeChallenge = base64url(sha256(codeVerifier));  // S256 challenge

  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY!);
  authUrl.searchParams.set("redirect_uri", process.env.TIKTOK_REDIRECT_URI!);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "user.info.basic,video.list");
  authUrl.searchParams.set("state", state);

  // PKCE params
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(authUrl.toString());

  // Store nonce + verifier in httpOnly cookies
  res.cookies.set("tiktok_oauth_nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 10 * 60,
  });

  res.cookies.set("tiktok_code_verifier", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 10 * 60,
  });

  return res;
}
