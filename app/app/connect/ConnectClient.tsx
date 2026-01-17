"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ConnectClient() {
  const params = useSearchParams();
  const connected = params.get("connected");

  const [email, setEmail] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Get logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);

      // Get org membership
      const { data: membership } = await supabase
        .from("memberships")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      setOrgId(membership?.org_id ?? null);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return <div className="p-8">Loading…</div>;
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Connect Accounts</h1>
        <p className="opacity-80 text-sm">Signed in as: {email ?? "Unknown"}</p>
        <p className="opacity-80 text-sm">Org ID: {orgId ?? "—"}</p>
      </div>

      {/* Status banner */}
      <div className="rounded border p-4 bg-gray-50">
        <div className="font-semibold">Integration status</div>
        <div className="text-sm opacity-80">
          TikTok OAuth is currently being finalized in sandbox. You can still use
          the app via CSV imports and trend exploration.
        </div>
      </div>

      {/* Integrations */}
      <div className="space-y-3">
        {/* TikTok */}
        <div className="rounded border p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold">TikTok</div>
            <div className="text-sm opacity-80">
              In progress (sandbox)
            </div>
          </div>
          <button
            disabled
            className="rounded border px-4 py-2 opacity-50 cursor-not-allowed"
          >
            Connect (soon)
          </button>
        </div>

        {/* YouTube */}
        <div className="rounded border p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold">YouTube</div>
            <div className="text-sm opacity-80">
              Coming next
            </div>
          </div>
          <button
            disabled
            className="rounded border px-4 py-2 opacity-50 cursor-not-allowed"
          >
            Connect (soon)
          </button>
        </div>

        {/* CSV Import */}
        <div className="rounded border p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold">CSV Import</div>
            <div className="text-sm opacity-80">
              Available now
            </div>
          </div>
          <a
            href="/app/import"
            className="rounded border px-4 py-2 hover:bg-gray-50"
          >
            Upload CSV
          </a>
        </div>
      </div>

      {/* Optional success message (kept for future TikTok) */}
      {connected && (
        <div className="rounded border p-3 bg-green-50">
          ✅ Connected: {connected}
        </div>
      )}
    </div>
  );
}
