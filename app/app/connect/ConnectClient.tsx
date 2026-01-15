"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";

export default function ConnectClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [orgId, setOrgId] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  const connected = params.get("connected");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.push("/auth");
        return;
      }

      setEmail(session.user.email ?? "");

      const { data: memberships, error } = await supabase
        .from("memberships")
        .select("org_id")
        .limit(1);

      if (error) {
        console.error(error);
        return;
      }

      setOrgId(memberships?.[0]?.org_id ?? "");
    })();
  }, [router]);

  function connectTikTok() {
    if (!orgId) return;
    window.location.href = `/api/oauth/tiktok/start?org_id=${encodeURIComponent(orgId)}`;
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Connect Accounts</h1>
      <p className="opacity-80">Logged in as: {email}</p>
      <p className="opacity-80">Org: {orgId || "(loading...)"}</p>

      {connected === "tiktok" && (
        <div className="rounded border p-3">✅ TikTok connected successfully.</div>
      )}

      <button
        className="rounded border px-4 py-2"
        onClick={connectTikTok}
        disabled={!orgId}
      >
        Connect TikTok
      </button>
    </div>
  );
}
