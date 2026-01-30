"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type TrendSignal = {
  id: string;
  title: string;
  platform: string;
  velocity: number;
  conviction: "high" | "medium" | "low";
  category: string;
  timestamp: string;
};

export default function DashboardPage() {
  const [email, setEmail] = useState<string>("");
  const [orgId, setOrgId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    avgEngagement: 0,
    activeTrends: 0,
  });

  // Mock trend signals for now (we'll replace with real data when Supabase is back)
  const [signals] = useState<TrendSignal[]>([
    {
      id: "1",
      title: "AI Agent Frameworks",
      platform: "X (Twitter)",
      velocity: 87,
      conviction: "high",
      category: "Technology",
      timestamp: "2h ago",
    },
    {
      id: "2",
      title: "Sustainability in Fashion",
      platform: "Instagram",
      velocity: 64,
      conviction: "medium",
      category: "Consumer",
      timestamp: "5h ago",
    },
    {
      id: "3",
      title: "Micro SaaS Monetization",
      platform: "LinkedIn",
      velocity: 45,
      conviction: "medium",
      category: "Business",
      timestamp: "8h ago",
    },
  ]);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (user) setEmail(user.email ?? "");

        const { data: memberships } = await supabase
          .from("memberships")
          .select("org_id")
          .limit(1);

        if (memberships?.[0]?.org_id) {
          setOrgId(memberships[0].org_id);
          
          // Load stats (when Supabase is back)
          // For now, mock data
          setStats({
            totalPosts: 247,
            totalViews: 1840000,
            avgEngagement: 4.2,
            activeTrends: 12,
          });
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#00ff88] font-mono text-sm">
          <span className="animate-pulse">INITIALIZING INTELLIGENCE TERMINAL...</span>
        </div>
      </div>
    );
  }

  const getConvictionColor = (conviction: string) => {
    switch (conviction) {
      case "high": return "text-[#00ff88]";
      case "medium": return "text-[#ffd93d]";
      case "low": return "text-[#ff6b6b]";
      default: return "text-gray-400";
    }
  };

  const getConvictionBg = (conviction: string) => {
    switch (conviction) {
      case "high": return "bg-[#00ff88]/10 border-[#00ff88]/30";
      case "medium": return "bg-[#ffd93d]/10 border-[#ffd93d]/30";
      case "low": return "bg-[#ff6b6b]/10 border-[#ff6b6b]/30";
      default: return "bg-gray-800/50 border-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-white">TREND</span>
                <span className="text-[#00ff88]">SCOPE</span>
              </h1>
              <p className="text-xs text-gray-500 font-mono mt-1">
                INTELLIGENCE TERMINAL v2.0
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-gray-500">OPERATOR</div>
                <div className="text-sm font-mono text-gray-300">{email}</div>
              </div>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#00ff88] to-[#00b8ff] flex items-center justify-center text-xs font-bold text-black">
                {email.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Status Bar */}
        <div className="mb-8 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#00ff88] animate-pulse"></div>
              <span className="text-gray-500">SYSTEM ACTIVE</span>
            </div>
            <div className="text-gray-600">
              ORG: <span className="text-gray-400">{orgId || "LOADING..."}</span>
            </div>
            <div className="text-gray-600">
              LAST SYNC: <span className="text-gray-400">12m ago</span>
            </div>
          </div>
          <div className="text-gray-600">
            {new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "TOTAL POSTS", value: stats.totalPosts.toLocaleString(), change: "+12.3%" },
            { label: "TOTAL VIEWS", value: (stats.totalViews / 1000000).toFixed(1) + "M", change: "+24.7%" },
            { label: "AVG ENGAGEMENT", value: stats.avgEngagement.toFixed(1) + "%", change: "+0.8%" },
            { label: "ACTIVE TRENDS", value: stats.activeTrends, change: "+3" },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-all group"
            >
              <div className="text-xs font-mono text-gray-500 mb-2">{stat.label}</div>
              <div className="text-3xl font-bold text-white mb-1 group-hover:text-[#00ff88] transition-colors">
                {stat.value}
              </div>
              <div className="text-xs font-mono text-[#00ff88]">{stat.change}</div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Signals */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">EMERGING SIGNALS</h2>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    Real-time trend detection across platforms
                  </p>
                </div>
                <Link
                  href="/app/trends"
                  className="text-xs font-mono text-[#00ff88] hover:text-[#00ff88]/80 transition-colors"
                >
                  VIEW ALL →
                </Link>
              </div>

              <div className="divide-y divide-gray-800">
                {signals.map((signal, idx) => (
                  <div
                    key={signal.id}
                    className="px-6 py-4 hover:bg-gray-900/50 transition-colors group cursor-pointer"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-sm font-semibold text-white group-hover:text-[#00ff88] transition-colors">
                            {signal.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-mono border ${getConvictionBg(
                              signal.conviction
                            )}`}
                          >
                            <span className={getConvictionColor(signal.conviction)}>
                              {signal.conviction.toUpperCase()}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                          <span>{signal.platform}</span>
                          <span>•</span>
                          <span>{signal.category}</span>
                          <span>•</span>
                          <span>{signal.timestamp}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">VELOCITY</div>
                        <div className="text-2xl font-bold text-[#00ff88]">{signal.velocity}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Link
                href="/app/posts"
                className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-lg p-5 hover:border-[#00ff88]/50 transition-all group"
              >
                <div className="text-xs font-mono text-gray-500 mb-2">YOUR CONTENT</div>
                <div className="text-lg font-bold text-white group-hover:text-[#00ff88] transition-colors">
                  View Posts →
                </div>
              </Link>
              <Link
                href="/app/import"
                className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-lg p-5 hover:border-[#00ff88]/50 transition-all group"
              >
                <div className="text-xs font-mono text-gray-500 mb-2">DATA IMPORT</div>
                <div className="text-lg font-bold text-white group-hover:text-[#00ff88] transition-colors">
                  Upload CSV →
                </div>
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* System Status */}
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-lg p-6">
              <h3 className="text-sm font-bold text-white mb-4">SYSTEM STATUS</h3>
              <div className="space-y-3">
                {[
                  { label: "Data Pipeline", status: "OPERATIONAL", color: "text-[#00ff88]" },
                  { label: "AI Analysis", status: "OPERATIONAL", color: "text-[#00ff88]" },
                  { label: "Social Connectors", status: "PARTIAL", color: "text-[#ffd93d]" },
                  { label: "Real-time Sync", status: "SCHEDULED", color: "text-gray-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-500">{item.label}</span>
                    <span className={item.color}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-lg p-6">
              <h3 className="text-sm font-bold text-white mb-4">QUICK ACCESS</h3>
              <div className="space-y-2">
                {[
                  { label: "Analytics", href: "/app/analytics/strategies" },
                  { label: "Saved Insights", href: "/app/saved" },
                  { label: "Connect Accounts", href: "/app/connect" },
                ].map((link, i) => (
                  <Link
                    key={i}
                    href={link.href}
                    className="block text-sm text-gray-400 hover:text-[#00ff88] transition-colors font-mono"
                  >
                    → {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Intelligence Note */}
            <div className="bg-gradient-to-br from-[#00ff88]/5 to-transparent border border-[#00ff88]/20 rounded-lg p-6">
              <div className="text-xs font-mono text-[#00ff88] mb-2">INTELLIGENCE NOTE</div>
              <p className="text-xs text-gray-400 leading-relaxed">
                AI-powered trend analysis is identifying 3 high-conviction opportunities in your sector.
                Review signals for actionable insights.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}