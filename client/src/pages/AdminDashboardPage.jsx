import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { BarChart3, CheckCircle2, ClipboardList, PackageCheck, Users, Gavel, BadgeCheck, CircleX, Coins } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/auth.context";
import { AccessCard, LoadingState } from "../components/ui";
import { PageShell } from "../components/layout";

const AdminDashboardPage = () => {
  const { isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "ADMIN") return undefined;
    api.get("/admin/dashboard")
      .then(({ data }) => setStats(data.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user?.id, user?.role]);

  if (!isAuthenticated || user?.role !== "ADMIN") return <AccessCard icon={BarChart3} title="Admin access required" description="This dashboard is available to the Athar administrator." />;
  return <PageShell containerClassName="max-w-6xl"><div className="py-12">
    <p className="mb-3 text-xs font-bold text-emerald-400">Athar administration</p>
    <h1 className="mb-3 text-4xl font-semibold text-white">Dashboard</h1>
    <p className="mb-8 text-slate-400">Community report and return activity.</p>
    {loading ? <LoadingState label="Loading dashboard..." /> : !stats ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-300">Could not load dashboard statistics.</p> : <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={ClipboardList} label="All lost reports" value={stats.total_reports} />
        <Stat icon={PackageCheck} label="Delivered items" value={stats.delivered_items} />
        <Stat icon={CheckCircle2} label="Claims accepted · 7 days" value={stats.claims_approved_last_7_days} />
        <Stat icon={Users} label="Accepted claims total" value={stats.claims_approved_total} />
      </div>
      <h2 className="mb-4 mt-8 text-lg font-bold text-white">Auction activity</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={Gavel} label="Active auctions" value={stats.active_auctions} />
        <Stat icon={BadgeCheck} label="Items sold" value={stats.items_sold} />
        <Stat icon={PackageCheck} label="Items collected" value={stats.items_collected} />
        <Stat icon={CircleX} label="Unsold items" value={stats.unsold_items} />
        <Stat icon={Coins} label="Winning amounts · EGP" value={stats.total_winning_amount} />
      </div>
      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="font-bold text-white">Athar AI Agent</p><p className="mt-1 text-sm text-slate-400">Groq handles assistant chat, item matching, photo comparison, and claim review.</p></div>
          <span className={`rounded-full px-3 py-2 text-xs font-bold ${stats.ai_agent?.status === "configured" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>{stats.ai_agent?.status === "configured" ? "AI provider keys configured" : "Check AI API keys"}</span>
        </div>
        <p className="mt-3 text-xs text-slate-500">Chat: {stats.ai_agent?.chat_provider || "Groq API"} · {stats.ai_agent?.chat_model || "allam-2-7b"} · Matching: {stats.ai_agent?.matching_provider || "Groq API"} · {stats.ai_agent?.matching_model || "unknown"}.</p>
        <p className="mt-2 text-xs text-slate-500">AI suggests likely matches; it does not prove ownership or approve claims automatically.</p>
      </section>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/manage-users" className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:border-emerald-500/40">Manage users</Link>
        <Link to="/admin/auctions" className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:border-cyan-500/40">Manage auctions</Link>
        <Link to="/lost-reports" className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:border-emerald-500/40">Browse all reports</Link>
      </div>
    </>}
  </div></PageShell>;
};

const Stat = ({ icon: Icon, label, value }) => <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">{React.createElement(Icon, { size: 20 })}</div><p className="text-3xl font-semibold text-white">{value ?? 0}</p><p className="mt-2 text-sm text-slate-400">{label}</p></div>;

export default AdminDashboardPage;
