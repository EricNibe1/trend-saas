"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "Logged in" : "Not logged in");
    });
  }, []);

  return (
    <div className="p-10 text-xl">
      Supabase Status: {status}
    </div>
  );
}
