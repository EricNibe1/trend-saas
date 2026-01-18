"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AggRow = {
  key: string;
  count: number;
  avg_views: number;
  avg_likes: number;
  avg_comments: number;
  avg_shares: number;
  avg_saves: number;
  avg_score: number;
};

function mean(nums: number[]) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default function StrategyAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);

  const [rows, setRows] = useState<
    Array<{
      post_id: string;
      hook_type: string | null;
      cta_type: string | null;
      format_type: string | null;
      pacing_bucket: string | null;
      views: number;
      likes: number;
      comments: number;
      shares: number;
      saves: number;
      score: number;
    }>
  >([]);

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

      // Load posts for org
      const { data: posts, error: pErr } = await supabase
        .from("posts")
        .select("id")
        .eq("org_id", org)
        .limit(200);

      if (pErr) {
        setStatus("Posts load failed: " + pErr.message);
        setLoading(false);
        return;
      }

      const postIds = (posts || []).map((p: any) => p.id);
      if (postIds.length === 0) {
        setStatus("No posts found. Import CSV first.");
        setLoading(false);
        return;
      }

      // Load strategies (some posts may not have strategies yet)
      const { data: strategies, error: sErr } = await supabase
        .from("post_strategies")
        .select("post_id, hook_type, cta_type, format_type, pacing_bucket")
        .in("post_id", postIds);

      if (sErr) {
        setStatus("Strategies load failed: " + sErr.message);
        setLoading(false);
        return;
      }

      const stratMap = new Map<string, any>();
      (strategies || []).forEach((s: any) => stratMap.set(s.post_id, s));

      // Load latest metrics for each post (MVP: 1 query per post)
      const combined: any[] = [];
      for (const id of postIds) {
        const s = stratMap.get(id) || {};
        const { data: met } = await supabase
          .from("post_metrics_daily")
          .select("views, likes, comments, shares, saves")
          .eq("post_id", id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const views = met?.views ?? 0;
        const likes = met?.likes ?? 0;
        const comments = met?.comments ?? 0;
        const shares = met?.shares ?? 0;
        const saves = met?.saves ?? 0;

        const score = views + likes + shares * 3 + saves * 2;

        combined.push({
          post_id: id,
          hook_type: s.hook_type ?? null,
          cta_type: s.cta_type ?? null,
          format_type: s.format_type ?? null,
          pacing_bucket: s.pacing_bucket ?? null,
          views,
          likes,
          comments,
          shares,
          saves,
          score,
        });
      }

      setRows(combined);
      setStatus(`Loaded ${combined.length} posts ✅ (Tag more posts for better insights)`);
      setLoading(false);
    })();
  }, []);

  const agg = useMemo(() => {
    const by = (field: "hook_type" | "cta_type" | "format_type" | "pacing_bucket") => {
      const groups = new Map<string, typeof rows>();
      for (const r of rows) {
        const k = (r as any)[field] || "(untagged)";
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(r);
      }

      const out: AggRow[] = [];
      for (const [k, arr] of groups.entries()) {
        const avg_views = mean(arr.map((x) => x.views));
        const avg_likes = mean(arr.map((x) => x.likes));
        const avg_comments = mean(arr.map((x) => x.comments));
        const avg_shares = mean(arr.map((x) => x.shares));
        const avg_saves = mean(arr.map((x) => x.saves));
        const avg_score = mean(arr.map((x) => x.score));

        out.push({
          key: k,
          count: arr.length,
          avg_views,
          avg_likes,
          avg_comments,
          avg_shares,
          avg_saves,
          avg_score,
        });
      }

      out.sort((a, b) => b.avg_score - a.avg_score);
      return out;
    };

    return {
      hook: by("hook_type"),
      cta: by("cta_type"),
      format: by("format_type"),
      pacing: by("pacing_bucket"),
    };
  }, [rows]);

  if (loading) return <div className="p-8">Loading…</div>;

  const Table = ({ title, data }: { title: string; data: AggRow[] }) => (
    <div className="rounded border p-4 space-y-3">
      <div className="font-semibold">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left opacity-80">
              <th className="py-2 pr-4">Tag</th>
              <th className="py-2 pr-4">Count</th>
              <th className="py-2 pr-4">Avg Score</th>
              <th className="py-2 pr-4">Avg Views</th>
              <th className="py-2 pr-4">Avg Likes</th>
              <th className="py-2 pr-4">Avg Shares</th>
              <th className="py-2 pr-4">Avg Saves</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.key} className="border-t">
                <td className="py-2 pr-4 font-medium">{r.key}</td>
                <td className="py-2 pr-4">{r.count}</td>
                <td className="py-2 pr-4">{Math.round(r.avg_score)}</td>
                <td className="py-2 pr-4">{Math.round(r.avg_views)}</td>
                <td className="py-2 pr-4">{Math.round(r.avg_likes)}</td>
                <td className="py-2 pr-4">{Math.round(r.avg_shares)}</td>
                <td className="py-2 pr-4">{Math.round(r.avg_saves)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Strategy Analytics</h1>
          <div className="text-sm opacity-80">Org: {orgId ?? "—"}</div>
        </div>

        <div className="flex gap-2">
          <a className="rounded border px-4 py-2 hover:bg-gray-50" href="/app/posts">
            My Posts
          </a>
          <a className="rounded border px-4 py-2 hover:bg-gray-50" href="/app/trends">
            Trends
          </a>
        </div>
      </div>

      {status && <div className="text-sm">{status}</div>}

      <Table title="Hook types" data={agg.hook} />
      <Table title="CTA types" data={agg.cta} />
      <Table title="Format types" data={agg.format} />
      <Table title="Pacing buckets" data={agg.pacing} />
    </div>
  );
}
