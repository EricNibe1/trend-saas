"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      
      if (data.session?.user) {
        router.replace("/app");
      } else {
        router.replace("/auth");
      }
    }
    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-[#00ff88] font-mono text-sm animate-pulse">
        LOADING...
      </div>
    </div>
  );
}