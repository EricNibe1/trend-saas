"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ParsedRow = {
  platform_post_id: string;
  created_time?: string | null;
  caption?: string | null;
  permalink?: string | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  date?: string | null; // YYYY-MM-DD
};

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  // Basic CSV parser (handles quoted commas)
  const splitLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' ) {
        // toggle quotes (double quote escape "")
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headers = splitLine(lines[0]).map((h) => h.replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const cols = splitLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = (cols[idx] ?? "").replace(/^"|"$/g, "")));
    return obj;
  });

  return { headers, rows };
}

function toNum(v: string | undefined): number | null {
  if (!v) return null;
  const cleaned = v.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function pick(obj: Record<string, string>, keys: string[]) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== "") return obj[k];
  }
  return "";
}

export default function ImportPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"tiktok" | "instagram" | "facebook" | "youtube">("tiktok");
  const [rawPreview, setRawPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [status, setStatus] = useState<string>("");

  const sampleMappingHint = useMemo(() => {
    return (
      "Expected columns (any names are OK; we try common ones):\n" +
      "- post id (e.g. Video ID)\n" +
      "- date (YYYY-MM-DD) OR created time\n" +
      "- views, likes, comments, shares (optional)\n" +
      "- caption, permalink (optional)\n"
    );
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setStatus("");
    const f = e.target.files?.[0];
    if (!f) return;

    setFileName(f.name);

    const text = await f.text();
    setRawPreview(text.slice(0, 1500));

    const { rows } = parseCSV(text);

    // Flexible mapping: tries common export column names
    const mapped: ParsedRow[] = rows.map((r) => {
      const platform_post_id = pick(r, ["Video ID", "video_id", "post_id", "id", "Post ID", "Content ID"]);
      const created_time = pick(r, ["Created", "created_time", "Create time", "createdAt", "Publish time", "Published At"]);
      const date = pick(r, ["Date", "date", "Day"]);
      const caption = pick(r, ["Caption", "caption", "Description", "description", "Title", "title"]);
      const permalink = pick(r, ["Permalink", "permalink", "URL", "url", "Link", "link"]);

      return {
        platform_post_id,
        created_time: created_time || null,
        date: date || null,
        caption: caption || null,
        permalink: permalink || null,
        views: toNum(pick(r, ["Views", "views", "Video views", "Impressions", "impressions"])),
        likes: toNum(pick(r, ["Likes", "likes"])),
        comments: toNum(pick(r, ["Comments", "comments"])),
        shares: toNum(pick(r, ["Shares", "shares"])),
        saves: toNum(pick(r, ["Saves", "saves", "Favorites", "favorites"])),
      };
    });

    // keep only rows with a post id
    const cleaned = mapped.filter((m) => m.platform_post_id);
    setParsed(cleaned.slice(0, 500)); // MVP safety cap
    setStatus(`Parsed ${cleaned.length} rows (showing first ${Math.min(cleaned.length, 500)}).`);
  }

  async function uploadToSupabase() {
    setStatus("Uploading...");
    try {
      // 1) must be logged in
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setStatus("Not logged in. Go to /auth first.");
        return;
      }

      // 2) get org
      const { data: membership, error: memErr } = await supabase
        .from("memberships")
        .select("org_id")
        .eq("user_id", u.user.id)
        .limit(1)
        .single();

      if (memErr || !membership?.org_id) {
        setStatus("Could not find org membership.");
        return;
      }
      const orgId = membership.org_id as string;

      if (parsed.length === 0) {
        setStatus("No parsed rows to upload.");
        return;
      }

      // 3) upsert posts
      const postsPayload = parsed.map((r) => ({
        org_id: orgId,
        platform,
        platform_post_id: r.platform_post_id,
        created_time: r.created_time ? new Date(r.created_time).toISOString() : null,
        caption: r.caption,
        permalink: r.permalink,
        media_type: platform === "youtube" ? "video" : null,
      }));

      const { data: postsUpserted, error: postErr } = await supabase
        .from("posts")
        .upsert(postsPayload, { onConflict: "platform,platform_post_id" })
        .select("id,platform_post_id");

      if (postErr) {
        setStatus(`Posts upsert failed: ${postErr.message}`);
        return;
      }

      // Map platform_post_id -> post uuid
      const idMap = new Map<string, string>();
      (postsUpserted || []).forEach((p: any) => idMap.set(p.platform_post_id, p.id));

      // 4) upsert daily metrics (use Date column if provided; else today)
      const today = new Date().toISOString().slice(0, 10);
      const metricsPayload = parsed
        .map((r) => {
          const postId = idMap.get(r.platform_post_id);
          if (!postId) return null;

          return {
            post_id: postId,
            date: r.date || today,
            views: r.views,
            likes: r.likes,
            comments: r.comments,
            shares: r.shares,
            saves: r.saves,
          };
        })
        .filter(Boolean) as any[];

      if (metricsPayload.length > 0) {
        const { error: metErr } = await supabase
          .from("post_metrics_daily")
          .upsert(metricsPayload, { onConflict: "post_id,date" });

        if (metErr) {
          setStatus(`Metrics upsert failed: ${metErr.message}`);
          return;
        }
      }

      setStatus(`✅ Uploaded ${postsPayload.length} posts and ${metricsPayload.length} daily metric rows.`);
    } catch (e: any) {
      setStatus(`Upload error: ${e?.message ?? String(e)}`);
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">CSV Import</h1>
        <p className="opacity-80 text-sm">
          Upload an analytics export (CSV). We’ll parse it and save posts + metrics into Supabase.
        </p>
      </div>

      <div className="rounded border p-4 space-y-3">
        <div className="flex gap-2 items-center flex-wrap">
          <label className="text-sm opacity-80">Platform:</label>
          <select
            className="border rounded px-3 py-2"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as any)}
          >
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>

        <input type="file" accept=".csv,text/csv" onChange={onFile} />

        <pre className="text-xs opacity-70 whitespace-pre-wrap">{sampleMappingHint}</pre>

        {fileName && <div className="text-sm">File: {fileName}</div>}
        {status && <div className="text-sm">{status}</div>}

        <button
          onClick={uploadToSupabase}
          className="rounded border px-4 py-2"
          disabled={parsed.length === 0}
        >
          Upload to Supabase
        </button>
      </div>

      {rawPreview && (
        <div className="rounded border p-4">
          <div className="font-semibold mb-2">Raw preview</div>
          <pre className="text-xs whitespace-pre-wrap">{rawPreview}</pre>
        </div>
      )}

      {parsed.length > 0 && (
        <div className="rounded border p-4">
          <div className="font-semibold mb-2">Parsed preview (first 10)</div>
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(parsed.slice(0, 10), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
