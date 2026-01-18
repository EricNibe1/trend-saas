"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DebugPage() {
  const [text, setText] = useState("Loading session…");

  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      const email = res.data.session?.user?.email ?? null;
      setText(
        JSON.stringify(
          {
            hasSession: !!res.data.session,
            email,
            urlPrefix: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").slice(0, 30),
            anonPrefix: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").slice(0, 8),
            anonLen: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").length,
          },
          null,
          2
        )
      );
    });
  }, []);

  return (
    <pre style={{ padding: 16, whiteSpace: "pre-wrap" }}>
      {text}
    </pre>
  );
}
