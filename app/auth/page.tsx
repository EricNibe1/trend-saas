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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const sessionRes = await supabase.auth.getSession();
        const session = sessionRes.data.session;
        
        console.log("Auth check:", { 
          hasSession: !!session, 
          user: session?.user?.email 
        });

        if (session?.user && mounted) {
          console.log("Session found, redirecting to /app");
          router.replace("/app");
          return;
        }

        if (mounted) setReady(true);
      } catch (error) {
        console.error("Boot error:", error);
        if (mounted) {
          setReady(true);
          setMsg("Error checking session: " + (error as Error).message);
        }
      }
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);
      
      if (session?.user && mounted) {
        console.log("User logged in, redirecting to /app");
        router.replace("/app");
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setIsSubmitting(true);

    try {
      console.log("Attempting sign in for:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error);
        setMsg("Error: " + error.message);
        setIsSubmitting(false);
        return;
      }

      console.log("Sign in success:", data.user?.email);

      if (data.session?.user) {
        console.log("Session created, redirecting to /app");
        router.replace("/app");
        return;
      }

      // Fallback check
      const { data: s2 } = await supabase.auth.getSession();
      if (s2.session?.user) {
        console.log("Session found on recheck, redirecting to /app");
        router.replace("/app");
      } else {
        console.error("Sign in succeeded but no session found");
        setMsg("Sign in succeeded but session not created. Please try again.");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Sign in exception:", error);
      setMsg("Error: " + (error as Error).message);
      setIsSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <form onSubmit={signIn} className="border rounded-lg p-6 bg-white shadow-sm space-y-4">
          <div className="text-2xl font-semibold text-center mb-2">Sign in to TrendScope</div>

          <div>
            <label className="text-sm font-medium block mb-2">Email</label>
            <input
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Password</label>
            <input
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              required
              disabled={isSubmitting}
            />
          </div>

          {msg && (
            <div className="text-sm p-3 rounded bg-red-50 border border-red-200 text-red-800">
              {msg}
            </div>
          )}

          <button 
            className="w-full bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
          
          <div className="text-xs text-center text-gray-500 mt-4">
            Check browser console (F12) for debug info
          </div>
        </form>
      </div>
    </div>
  );
}