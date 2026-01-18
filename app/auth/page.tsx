"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  // On-screen debug (so you don't need devtools)
  const [sessionStatus, setSessionStatus] = useState<string>("(checking...)");

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const sessionRes = await supabase.auth.getSession();

      // Visible debug box so you can confirm env vars + session
      if (mounted) {
        setSessionStatus(
          JSON.stringify(
            {
              hasSession: !!sessionRes.data.session,
              sessionEmail: sessionRes.data.session?.user?.email ?? null,
              urlPrefix: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").slice(0, 35),
              anonPrefix: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").slice(0, 8),
              anonLen: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").length,
            },
            null,
            2
          )
        );
      }

      // If already logged in, go to /app
      const session = sessionRes.data.session;
      if (session?.user) {
        router.replace("/app");
        return;
      }

      if (mounted) setReady(true);
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        router.replace("/app");
        return;
      }

      // keep debug current if user signs out etc.
      const sessionRes = await supabase.auth.getSession();
      setSessionStatus(
        JSON.stringify(
          {
            hasSession: !!sessionRes.data.session,
            sessionEmail: sessionRes.data.session?.user?.email ?? null,
            urlPrefix: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").slice(0, 35),
            anonPrefix: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").slice(0, 8),
            anonLen: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").length,
          },
          null,
          2
        )
      );
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    // Force redirect immediately if session is returned
    if (data.session?.user) {
      router.replace("/app");
      return;
    }

    // Fallback: sometimes session arrives a tick later
    const { data: s2 } = await supabase.auth.getSession();
    if (s2.session?.user) router.replace("/app");
  }

  if (!ready) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <pre className="text-xs border rounded p-3 bg-white mb-4 whitespace-pre-wrap">
          {sessionStatus}
        </pre>

        <form onSubmit={signIn} className="border rounded-lg p-5 bg-white">
          <div className="text-lg font-semibold mb-4">Sign in</div>

          <label className="text-sm block mb-2">Email</label>
          <input
            className="w-full border rounded px-3 py-2 mb-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />

          <label className="text-sm block mb-2">Password</label>
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />

          {msg && <div className="text-sm mb-3">{msg}</div>}

          <button className="w-full border rounded px-3 py-2 hover:bg-gray-50" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
