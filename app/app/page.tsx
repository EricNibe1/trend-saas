"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AppHome() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [orgId, setOrgId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.push("/auth");
        return;
      }

      setEmail(session.user.email ?? "");

      // Find the user's org_id via memberships
      const { data: memberships, error } = await supabase
        .from("memberships")
        .select("org_id")
        .limit(1);

      if (error) {
        console.error(error);
        return;
      }

      setOrgId(memberships?.[0]?.org_id ?? "");
    })();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth");
  }

  return (
    <div className="p-8 space-y-3">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p>Logged in as: <b>{email}</b></p>
      <p>Your org_id: <b>{orgId || "(loading...)"}</b></p>

      <button className="rounded border px-3 py-2" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
