"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Strategy = {
  hook_type: string | null;
  cta_type: string | null;
  format_type: string | null;
  pacing_bucket: string | null;
};

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [latest, setLatest] = useState<any>(null);
  const [strategy, setStrategy] = useState<Strategy>({
    hook_type: null,
    cta_type: null,
    format_type: null,
    pacing_bucket: null,
  });
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setStatus("");

      // Fetch post
      const { data: p, error: pErr } = await supabase
        .from("posts")
        .select("id, platform, platform_post_id, created_time, caption, permalink")
        .eq("id", postId)
        .single();

      if (pErr) {
        setStatus("Failed to load post: " + pErr.message);
        setLoading(false);
        return;
      }

      setPost(p);

      // Latest metrics
      const { data: m } = await supabase
        .from("post_metrics_daily")
        .select("date, views, likes, comments, shares, saves")
        .eq("post_id", postId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      setLatest(m ?? null);

      // Strategy (may not exist yet)
      const { data: s } = await supabase
        .from("post_strategies")
        .select("hook_type, cta_type, format_type, pacing_bucket")
        .eq("post_id", postId)
        .maybeSingle();

      if (s) {
        setStrategy({
          hook_type: s.hook_type ?? null,
          cta_type: s.cta_type ?? null,
          format_type: s.format_type ?? null,
          pacing_bucket: s.pacing_bucket ?? null,
        });
      }

      setLoading(false);
    }

    load();
  }, [postId]);

  async function save() {
    setStatus("Saving…");

    const { error } = await supabase.from("post_strategies").upsert({
      post_id: postId,
      hook_type: strategy.hook_type,
      cta_type: strategy.cta_type,
      format_type: strategy.format_type,
      pacing_bucket: strategy.pacing_bucket,
    });

    if (error) {
      setStatus("Save failed: " + error.message);
      return;
    }

    setStatus("✅ Saved.");
  }

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex gap-2">
        <a className="rounded border px-4 py-2 hover:bg-gray-50" href="/app/posts">
          Back
        </a>
        {post?.permalink && (
          <a
            className="rounded border px-4 py-2 hover:bg-gray-50"
            href={post.permalink}
            target="_blank"
          >
            Open
          </a>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Post Detail</h1>
        <div className="text-sm opacity-80">
          {post?.platform?.toUpperCase()} • {post?.platform_post_id}
        </div>
        <div className="text-sm opacity-80">
          {post?.created_time ? new Date(post.created_time).toLocaleString() : "—"}
        </div>
      </div>

      {post?.caption && (
        <div className="rounded border p-4 whitespace-pre-wrap text-sm">
          {post.caption}
        </div>
      )}

      <div className="rounded border p-4 bg-gray-50">
        <div className="font-semibold">Latest metrics</div>
        {latest ? (
          <div className="text-sm opacity-80">
            <div>Date: {latest.date}</div>
            <div>
              Views: {latest.views ?? "—"} • Likes: {latest.likes ?? "—"} • Comments:{" "}
              {latest.comments ?? "—"} • Shares: {latest.shares ?? "—"} • Saves:{" "}
              {latest.saves ?? "—"}
            </div>
          </div>
        ) : (
          <div className="text-sm opacity-80">No metrics found.</div>
        )}
      </div>

      <div className="rounded border p-4 space-y-3">
        <div className="font-semibold">Retention strategy tags</div>

        <div className="space-y-2">
          <label className="block text-sm opacity-80">Hook type</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={strategy.hook_type ?? ""}
            onChange={(e) => setStrategy((s) => ({ ...s, hook_type: e.target.value || null }))}
          >
            <option value="">—</option>
            <option value="question_hook">Question hook</option>
            <option value="bold_claim">Bold claim</option>
            <option value="shock_visual">Shock visual</option>
            <option value="teaser">Teaser / “wait for it”</option>
            <option value="story_start">Story start</option>
          </select>

          <label className="block text-sm opacity-80">CTA type</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={strategy.cta_type ?? ""}
            onChange={(e) => setStrategy((s) => ({ ...s, cta_type: e.target.value || null }))}
          >
            <option value="">—</option>
            <option value="follow">Follow</option>
            <option value="comment">Comment</option>
            <option value="save">Save</option>
            <option value="share">Share</option>
            <option value="link_in_bio">Link in bio</option>
          </select>

          <label className="block text-sm opacity-80">Format type</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={strategy.format_type ?? ""}
            onChange={(e) => setStrategy((s) => ({ ...s, format_type: e.target.value || null }))}
          >
            <option value="">—</option>
            <option value="talking_head">Talking head</option>
            <option value="edit_montage">Edit montage</option>
            <option value="voiceover">Voiceover</option>
            <option value="text_only">Text-only</option>
            <option value="screen_recording">Screen recording</option>
          </select>

          <label className="block text-sm opacity-80">Pacing</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={strategy.pacing_bucket ?? ""}
            onChange={(e) => setStrategy((s) => ({ ...s, pacing_bucket: e.target.value || null }))}
          >
            <option value="">—</option>
            <option value="slow">Slow</option>
            <option value="medium">Medium</option>
            <option value="fast">Fast</option>
            <option value="very_fast">Very fast</option>
          </select>
        </div>

        <button className="rounded border px-4 py-2 hover:bg-gray-50" onClick={save}>
          Save tags
        </button>

        {status && <div className="text-sm">{status}</div>}
      </div>
    </div>
  );
}
