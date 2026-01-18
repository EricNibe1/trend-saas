"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TrendItem = {
  platform: string;
  title: string;
  permalink: string | null;
  score: number;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  date: string | null;
  post_id?: string | null;
};

export default function TrendsPage() {
  const [q, setQ] = useState("");
  const [window, setWindow] = useState<"24h" | "72h" | "7d">("7d");
  const [status, setStatus] = useState<string>("");
  const [items, setItems] = useState<TrendItem[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data: membership } = await supabase
        .from("memberships")
        .select("org_id")
        .eq("user_id", u.user.id)
        .limit(1)
        .single();

      setOrgId(membership?.org_id ?? null);
    })();
  }, []);

  async function search() {
    setStatus("Searching…");
    setItems([]);

    if (!q.trim()) {
      setStatus("Type a niche/search term first.");
      return;
    }
    if (!orgId) {
      setStatus("No org found. Make sure you’re logged in and have a membership.");
      return;
    }

    // 1) check cache
    const cacheKey = `local:${q.trim().toLowerCase()}`;
    const { data: cached } = await supabase
      .from("trend_search_cache")
      .select("response_json, expires_at")
      .eq("platform", "local")
      .eq("query", cacheKey)
      .eq("time_window", window)
      .maybeSingle();

    if (cached?.response_json && cached?.expires_at && new Date(cached.expires_at) > new Date()) {
      setItems(cached.response_json as any);
      setStatus("Loaded from cache ✅");
      return;
    }

    // 2) Local “trends” = your imported posts ranked by simple score
    // Score formula (MVP): views + 3*shares + 2*saves + likes
    // Filter: caption contains query
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, platform, caption, permalink")
      .eq("org_id", orgId)
      .ilike("caption", `%${q.trim()}%`)
      .limit(50);

    if (error) {
      setStatus("Search failed: " + error.message);
      return;
    }

    const results: TrendItem[] = [];

    for (const p of posts || []) {
      const { data: met } = await supabase
        .from("post_metrics_daily")
        .select("date, views, likes, comments, shares, saves")
        .eq("post_id", p.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const views = met?.views ?? 0;
      const likes = met?.likes ?? 0;
      const shares = met?.shares ?? 0;
      const saves = met?.saves ?? 0;

      const score = views + likes + shares * 3 + saves * 2;

      results.push({
        platform: p.platform,
        title: (p.caption || "(no caption)").slice(0, 80),
        permalink: p.permalink,
        score,
        views: met?.views ?? null,
        likes: met?.likes ?? null,
        comments: met?.comments ?? null,
        shares: met?.shares ?? null,
        saves: met?.saves ?? null,
        date: met?.date ?? null,
        post_id: p.id,
      });
    }

    results.sort((a, b) => b.score - a.score);

    // 3) write cache (expires in 30 minutes)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await supabase.from("trend_search_cache").upsert(
      {
        platform: "local",
        query: cacheKey,
        time_window: window,
        response_json: results,
        expires_at: expiresAt,
      },
      { onConflict: "platform,query,time_window" }
    );

    setItems(results);
    setStatus(`Found ${results.length} items ✅`);
  }

  async function saveInspiration(item: TrendItem) {
    if (!orgId) return;

    const { error } = await supabase.from("saved_inspiration").insert({
      org_id: orgId,
      platform: item.platform,
      permalink: item.permalink ?? `local://post/${item.post_id}`,
      tags_json: {
        query: q.trim(),
        score: item.score,
        date: item.date,
      },
    });

    setStatus(error ? "Save failed: " + error.message : "Saved ✅");
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Trends</h1>
        <p className="text-sm opacity-80">
          MVP mode: trends are computed from your imported posts. APIs will plug in later.
        </p>
      </div>

      <div className="rounded border p-4 space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <input
            className="border rounded px-3 py-2 w-full sm:w-[420px]"
            placeholder="Search niche (ex: nfl playoffs, gym edits)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="border rounded px-3 py-2"
            value={window}
            onChange={(e) => setWindow(e.target.value as any)}
          >
            <option value="24h">24h</option>
            <option value="72h">72h</option>
            <option value="7d">7d</option>
          </select>

          <button className="rounded border px-4 py-2 hover:bg-gray-50" onClick={search}>
            Search
          </button>

          <a className="rounded border px-4 py-2 hover:bg-gray-50" href="/app/saved">
            Saved
          </a>
        </div>

        {status && <div className="text-sm">{status}</div>}
      </div>

      <div className="space-y-3">
        {items.map((it, idx) => (
          <div key={idx} className="rounded border p-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-semibold">
                {it.platform.toUpperCase()} • score {Math.round(it.score)}
              </div>
              <div className="text-sm opacity-80">{it.title}</div>
              <div className="text-sm opacity-80">
                Views: {it.views ?? "—"} • Likes: {it.likes ?? "—"} • Comments: {it.comments ?? "—"} •
                Shares: {it.shares ?? "—"} • Saves: {it.saves ?? "—"}
              </div>
            </div>

            <div className="flex gap-2 flex-col sm:flex-row">
              {it.permalink ? (
                <a className="rounded border px-3 py-2 text-sm hover:bg-gray-50" href={it.permalink} target="_blank">
                  Open
                </a>
              ) : (
                <span className="text-sm opacity-50 px-3 py-2">No link</span>
              )}

              <button
                className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => saveInspiration(it)}
              >
                Save
              </button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="rounded border p-4 text-sm opacity-80">
            Try importing a few posts first, then search for a keyword that appears in captions.
          </div>
        )}
      </div>
    </div>
  );
}
