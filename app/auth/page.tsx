"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setMsg(error.message);
    setMsg("Signed up! Check your email if confirmation is enabled.");
  }

  async function signIn() {
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMsg(error.message);
    router.push("/app");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-3 rounded-xl border p-5">
        <h1 className="text-xl font-semibold">Login / Signup</h1>

        <input
          className="w-full rounded border p-2"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded border p-2"
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            className="rounded border px-3 py-2"
            onClick={signUp}
            disabled={loading}
          >
            Sign up
          </button>
          <button
            className="rounded border px-3 py-2"
            onClick={signIn}
            disabled={loading}
          >
            Sign in
          </button>
        </div>

        {msg && <p className="text-sm opacity-80">{msg}</p>}
      </div>
    </div>
  );
}
