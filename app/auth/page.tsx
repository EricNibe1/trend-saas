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

  useEffect(() => {
    let mounted = true;

    async function boot() {
      // If already logged in, go to /app
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        router.replace("/app");
        return;
      }
      if (mounted) setReady(true);
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) router.replace("/app");
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setMsg(error.message);
    // success redirects via onAuthStateChange
  }

  if (!ready) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={signIn} className="w-full max-w-sm border rounded-lg p-5 bg-white">
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
  );
}
