"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PostRow = {
  id: string;
  platform: string;
  platform_post_id: string;
  created_time: string | null;
  caption: string | null;
  permalink: string | null;
  latest?: {
    date: string;
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
  } | null;
};

export default function PostsPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);

      // 1) auth
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) {
        setErr("Not logged in. Go to /auth first.");
        setLoading(false);
        return;
      }
      setEmail(user.email ?? null);

      // 2) org
      const { data: membership, error: memErr } = await supabase
        .from("memberships")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (memErr || !membership?.org_id) {
        setErr("Could not find org membership.");
        setLoading(false);
        return;
      }

      const org = membership.org_id as string;
      setOrgId(org);

      // 3) posts
      const { data: postsData, error: postsErr } = await supabase
        .from("posts")
        .select("id, platform, platform_post_id, created_time, caption, permalink")
        .eq("org_id", org)
        .order("created_time", { ascending: false, nullsFirst: false })
        .limit(50);

      if (postsErr) {
        setErr(postsErr.message);
        setLoading(false);
        return;
      }

      const basePosts: PostRow[] = (postsData || []).map((p: any) => ({
        id: p.id,
        platform: p.platform,
        platform_post_id: p.platform_post_id,
        created_time: p.created_time,
        caption: p.caption,
        permalink: p.permalink,
        latest: null,
      }));

      // 4) latest metrics per post (simple MVP: fetch last 1 for each post)
      // For up to 50 posts this is okay; later we’ll optimize with an SQL view/RPC.
      const enriched: PostRow[] = [];
      for (const p of basePosts) {
        const { data: met } = await supabase
          .from("post_metrics_daily")
          .select("date, views, likes, comments, shares, saves")
          .eq("post_id", p.id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        enriched.push({
          ...p,
          latest: met
            ? {
                date: met.date,
                views: met.views ?? null,
                likes: met.likes ?? null,
                comments: met.comments ?? null,
                shares: met.shares ?? null,
                saves: met.saves ?? null,
              }
            : null,
        });
      }

      setPosts(enriched);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">My Posts</h1>
        <p className="text-sm opacity-80">Signed in as: {email ?? "—"}</p>
        <p className="text-sm opacity-80">Org: {orgId ?? "—"}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <a className="rounded border px-4 py-2 hover:bg-gray-50" href="/app/import">
          Upload CSV
        </a>
        <a className="rounded border px-4 py-2 hover:bg-gray-50" href="/app/connect">
          Connect Accounts
        </a>
      </div>

      {err && <div className="rounded border p-3 bg-red-50">Error: {err}</div>}

      {posts.length === 0 ? (
        <div className="rounded border p-4">
          <div className="font-semibold">No posts yet</div>
          <div className="text-sm opacity-80">
            Import a CSV first at <code>/app/import</code>.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="rounded border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <a className="font-semibold underline" href={`/app/posts/${p.id}`}>
                    {p.platform.toUpperCase()} • {p.platform_post_id}
                  </a>
                  <div className="text-sm opacity-80">
                    {p.created_time ? new Date(p.created_time).toLocaleString() : "—"}
                  </div>
                </div>

                {p.permalink ? (
                  <a
                    className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
                    href={p.permalink}
                    target="_blank"
                  >
                    Open
                  </a>
                ) : (
                  <span className="text-sm opacity-50">No link</span>
                )}
              </div>

              {p.caption && (
                <div className="text-sm whitespace-pre-wrap">
                  {p.caption.length > 240 ? p.caption.slice(0, 240) + "…" : p.caption}
                </div>
              )}

              <div className="rounded border p-3 bg-gray-50">
                <div className="text-sm font-semibold">Latest metrics</div>
                {p.latest ? (
                  <div className="text-sm opacity-80">
                    <div>Date: {p.latest.date}</div>
                    <div>
                      Views: {p.latest.views ?? "—"} • Likes: {p.latest.likes ?? "—"} • Comments:{" "}
                      {p.latest.comments ?? "—"} • Shares: {p.latest.shares ?? "—"} • Saves:{" "}
                      {p.latest.saves ?? "—"}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm opacity-80">No metrics found.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
