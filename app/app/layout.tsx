"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const links = [
  { href: "/app/posts", label: "Posts" },
  { href: "/app/import", label: "CSV Import" },
  { href: "/app/trends", label: "Trends" },
  { href: "/app/saved", label: "Saved" },
  { href: "/app/analytics/strategies", label: "Analytics" },
  { href: "/app/connect", label: "Connect" },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/auth");
        return;
      }

      setEmail(data.user.email ?? null);
      setReady(true);
    })();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth");
  }

  if (!ready) {
    return <div className="p-8">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/app" className="font-semibold">
              TrendScope
            </Link>

            <div className="flex gap-2 flex-wrap">
              {links.map((l) => {
                const active =
                  pathname === l.href ||
                  pathname.startsWith(l.href + "/");

                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded px-3 py-1 text-sm border ${
                      active
                        ? "bg-gray-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {email && (
              <div className="text-xs opacity-70 hidden sm:block">
                {email}
              </div>
            )}

            <button
              onClick={signOut}
              className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
