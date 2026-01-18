"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AppHome() {
  const [email, setEmail] = useState<string>("");
  const [orgId, setOrgId] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      // Layout already guards auth. This is just to show info.
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (mounted) setEmail(user?.email ?? "");

      const { data: memberships, error } = await supabase
        .from("memberships")
        .select("org_id")
        .limit(1);

      if (error) {
        console.error(error);
        return;
      }

      if (mounted) setOrgId(memberships?.[0]?.org_id ?? "");
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    // layout will kick you to /auth automatically (or you can add router.replace here if you want)
  }

  return (
    <div className="p-8 space-y-3">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p>
        Logged in as: <b>{email || "(loading...)"}</b>
      </p>
      <p>
        Your org_id: <b>{orgId || "(loading...)"}</b>
      </p>

      <button className="rounded border px-3 py-2" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
