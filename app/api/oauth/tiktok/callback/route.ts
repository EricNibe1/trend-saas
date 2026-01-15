import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const enc = (s: string) => Buffer.from(s, "utf8").toString("base64");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code/state" }, { status: 400 });
  }

  const [nonce, orgId] = state.split("|");
  const cookieStore = await cookies();
  const cookieNonce = cookieStore.get("tiktok_oauth_nonce")?.value;
  const codeVerifier = cookieStore.get("tiktok_code_verifier")?.value;

  if (!nonce || !orgId || !cookieNonce || cookieNonce !== nonce) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }
  if (!codeVerifier) {
    return NextResponse.json({ error: "Missing PKCE code_verifier cookie" }, { status: 400 });
  }

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
      code_verifier: codeVerifier, // <-- PKCE
    }),
  });

  const tokenText = await tokenRes.text();
  let tokenJson: any = null;
  try { tokenJson = JSON.parse(tokenText); } catch {}

  if (!tokenRes.ok) {
    return NextResponse.json({ error: "Token exchange failed", details: tokenJson ?? tokenText }, { status: 500 });
  }

  const accessToken = tokenJson.access_token;
  const refreshToken = tokenJson.refresh_token;
  const expiresIn = tokenJson.expires_in;
  const openId = tokenJson.open_id ?? tokenJson.data?.open_id ?? tokenJson.user?.open_id;

  if (!accessToken || !openId) {
    return NextResponse.json({ error: "Missing token fields", tokenJson }, { status: 500 });
  }

  const expiresAt =
    typeof expiresIn === "number"
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

  const supabaseAdmin = getSupabaseAdmin();

  const { data: ca, error: caErr } = await supabaseAdmin
    .from("connected_accounts")
    .upsert(
      {
        org_id: orgId,
        platform: "tiktok",
        platform_account_id: openId,
        display_name: null,
      },
      { onConflict: "platform,platform_account_id" }
    )
    .select("id")
    .single();

  if (caErr || !ca) {
    return NextResponse.json({ error: caErr?.message ?? "Upsert failed" }, { status: 500 });
  }

  const { error: tokErr } = await supabaseAdmin.from("oauth_tokens").upsert({
    connected_account_id: ca.id,
    access_token_enc: enc(accessToken),
    refresh_token_enc: refreshToken ? enc(refreshToken) : null,
    expires_at: expiresAt,
  });

  if (tokErr) return NextResponse.json({ error: tokErr.message }, { status: 500 });

  // Clear cookies
  const res = NextResponse.redirect(new URL("/app/connect?connected=tiktok", url.origin));
  res.cookies.set("tiktok_oauth_nonce", "", { path: "/", maxAge: 0 });
  res.cookies.set("tiktok_code_verifier", "", { path: "/", maxAge: 0 });
  return res;
}
