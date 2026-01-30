"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AuthMode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const sessionRes = await supabase.auth.getSession();
        const session = sessionRes.data.session;

        if (session?.user && mounted) {
          router.replace("/app");
          return;
        }

        if (mounted) setReady(true);
      } catch (error) {
        console.error("Boot error:", error);
        if (mounted) {
          setReady(true);
          setMsg("Error checking session");
        }
      }
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && mounted) {
        router.replace("/app");
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMsg(error.message);
        setIsSubmitting(false);
        return;
      }

      if (data.session?.user) {
        router.replace("/app");
      }
    } catch (error) {
      setMsg("Sign in failed: " + (error as Error).message);
      setIsSubmitting(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    // Validation
    if (password !== confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setMsg("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) {
        setMsg(error.message);
        setIsSubmitting(false);
        return;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setMsg("Success! Check your email to confirm your account.");
        setIsSubmitting(false);
        return;
      }

      // If auto-confirmed (some Supabase configs), create org membership
      if (data.session?.user) {
        // Create organization for new user
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .insert({ name: `${email}'s Organization` })
          .select("id")
          .single();

        if (orgError) {
          console.error("Org creation error:", orgError);
        } else if (org) {
          // Create membership
          await supabase.from("memberships").insert({
            user_id: data.session.user.id,
            org_id: org.id,
            role: "owner",
          });
        }

        router.replace("/app");
      }
    } catch (error) {
      setMsg("Sign up failed: " + (error as Error).message);
      setIsSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#00ff88] font-mono text-sm animate-pulse">
          INITIALIZING...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-white">TREND</span>
            <span className="text-[#00ff88]">SCOPE</span>
          </h1>
          <p className="text-sm text-gray-500 font-mono">
            Intelligence Terminal v2.0
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-lg overflow-hidden">
          {/* Mode Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => {
                setMode("signin");
                setMsg(null);
              }}
              className={`flex-1 py-3 text-sm font-mono transition-colors ${
                mode === "signin"
                  ? "bg-gray-900 text-[#00ff88] border-b-2 border-[#00ff88]"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              SIGN IN
            </button>
            <button
              onClick={() => {
                setMode("signup");
                setMsg(null);
              }}
              className={`flex-1 py-3 text-sm font-mono transition-colors ${
                mode === "signup"
                  ? "bg-gray-900 text-[#00ff88] border-b-2 border-[#00ff88]"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              SIGN UP
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="p-6 space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-mono text-gray-500 block mb-2">EMAIL</label>
              <input
                className="w-full bg-black border border-gray-800 rounded px-4 py-3 text-white focus:outline-none focus:border-[#00ff88] transition-colors font-mono text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="operator@trendscope.io"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-mono text-gray-500 block mb-2">PASSWORD</label>
              <input
                className="w-full bg-black border border-gray-800 rounded px-4 py-3 text-white focus:outline-none focus:border-[#00ff88] transition-colors font-mono text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Confirm Password (Sign Up Only) */}
            {mode === "signup" && (
              <div>
                <label className="text-xs font-mono text-gray-500 block mb-2">
                  CONFIRM PASSWORD
                </label>
                <input
                  className="w-full bg-black border border-gray-800 rounded px-4 py-3 text-white focus:outline-none focus:border-[#00ff88] transition-colors font-mono text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* Error/Success Message */}
            {msg && (
              <div
                className={`text-xs font-mono p-3 rounded border ${
                  msg.includes("Success")
                    ? "bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88]"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
              >
                {msg}
              </div>
            )}

            {/* Submit Button */}
            <button
              className="w-full bg-[#00ff88] text-black rounded px-4 py-3 hover:bg-[#00ff88]/90 disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm font-bold transition-all"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "PROCESSING..."
                : mode === "signin"
                ? "SIGN IN →"
                : "CREATE ACCOUNT →"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-600 font-mono">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}