"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SavedItem = {
  id: string;
  platform: string;
  permalink: string;
  tags_json: any;
  created_at: string;
};

export default function SavedPage() {
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setStatus("");

      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setStatus("Not logged in. Go to /auth first.");
        setLoading(false);
        return;
      }

      const { data: membership, error: memErr } = await supabase
        .from("memberships")
        .select("org_id")
        .eq("user_id", u.user.id)
        .limit(1)
        .single();

      if (memErr || !membership?.org_id) {
        setStatus("No org membership found.");
        setLoading(false);
        return;
      }

      const org = membership.org_id as string;
      setOrgId(org);

      const { data, error } = await supabase
        .from("saved_inspiration")
        .select("id, platform, permalink, tags_json, created_at")
        .eq("org_id", org)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        setStatus("Load failed: " + error.message);
        setLoading(false);
        return;
      }

      setItems((data as any) || []);
      setLoading(false);
    })();
  }, []);

  async function remove(id: string) {
    setStatus("Removing…");
    const { error } = await supabase.from("saved_inspiration").delete().eq("id", id);
    if (error) {
      setStatus("Remove failed: " + error.message);
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
    setStatus("Removed ✅");
  }

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Saved Inspiration</h1>
          <div className="text-sm opacity-80">Org: {orgId ?? "—"}</div>
        </div>

        <div className="flex gap-2">
          <a className="rounded border px-4 py-2 hover:bg-gray-50" href="/app/trends">
            Back to Trends
          </a>
          <a className="rounded border px-4 py-2 hover:bg-gray-50" href="/app/posts">
            My Posts
          </a>
        </div>
      </div>

      {status && <div className="text-sm">{status}</div>}

      {items.length === 0 ? (
        <div className="rounded border p-4 text-sm opacity-80">
          Nothing saved yet. Go to <code>/app/trends</code> and click “Save”.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="rounded border p-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="font-semibold">{it.platform.toUpperCase()}</div>
                <div className="text-sm opacity-80 break-all">{it.permalink}</div>
                <div className="text-xs opacity-70">
                  Saved: {new Date(it.created_at).toLocaleString()}
                </div>
                {it.tags_json && (
                  <pre className="text-xs whitespace-pre-wrap opacity-80">
                    {JSON.stringify(it.tags_json, null, 2)}
                  </pre>
                )}
              </div>

              <div className="flex gap-2 flex-col sm:flex-row">
                {it.permalink.startsWith("http") ? (
                  <a
                    className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
                    href={it.permalink}
                    target="_blank"
                  >
                    Open
                  </a>
                ) : (
                  <span className="text-sm opacity-50 px-3 py-2">Local</span>
                )}

                <button
                  className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => remove(it.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
