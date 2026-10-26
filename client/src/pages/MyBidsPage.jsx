import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, Gavel, Package } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/auth.context";
import { AccessCard, EmptyState, LoadingState } from "../components/ui";
import { PageShell } from "../components/layout";

const stateStyles = {
  leading: "bg-emerald-500/10 text-emerald-200 border-emerald-400/20",
  outbid: "bg-amber-500/10 text-amber-200 border-amber-400/20",
  won: "bg-cyan-500/10 text-cyan-200 border-cyan-400/20",
  lost: "bg-slate-700/50 text-slate-300 border-slate-600",
  forfeited: "bg-rose-500/10 text-rose-200 border-rose-400/20",
};

const MyBidsPage = () => {
  const { isAuthenticated, user } = useAuth();
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "USER") return undefined;
    let active = true;
    const load = () => api.get("/user/bids")
      .then(({ data }) => { if (active) { setBids(data.data || []); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Could not load your bids"); })
      .finally(() => { if (active) setLoading(false); });
    load();
    const timer = window.setInterval(load, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isAuthenticated, user?.id, user?.role]);

  if (!isAuthenticated || user?.role !== "USER") return <AccessCard icon={Gavel} title="Sign in to track bids" description="Your bidding history is private to your account." />;
  return <PageShell containerClassName="max-w-5xl"><div className="py-12">
    <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-cyan-300"><Gavel size={15} /> AUCTION ACTIVITY</p>
    <h1 className="text-4xl font-semibold text-white">My bids</h1>
    <p className="mb-8 mt-3 text-slate-400">Track your standing, auction results and pickup deadlines.</p>
    {loading ? <LoadingState label="Loading your bids..." /> : error ? <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-200">{error}</div> : bids.length === 0 ? <EmptyState icon={Gavel} title="No bids yet" description="When you bid on an open auction, it will appear here." /> : <div className="space-y-4">{bids.map((bid) => {
      const image = Array.isArray(bid.item.image_urls) ? bid.item.image_urls[0] : null;
      return <article key={bid.auction_id} className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:p-5">
        {image ? <img src={image} alt="" className="h-20 w-full rounded-xl object-cover sm:w-24" /> : <div className="flex h-20 w-full items-center justify-center rounded-xl bg-slate-950 text-slate-600 sm:w-24"><Package /></div>}
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-white">{bid.item.item_type}</h2><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${stateStyles[bid.state] || stateStyles.lost}`}>{bid.state}</span></div><p className="mt-2 text-sm text-slate-400">Your bid <strong className="text-slate-200">{bid.amount} EGP</strong> · Current price <strong className="text-emerald-200">{bid.current_price} EGP</strong></p>{bid.state === "won" && bid.pickup_deadline && <p className="mt-1 text-xs font-semibold text-amber-200">Collect by {new Date(bid.pickup_deadline).toLocaleString()} and pay cash at pickup.</p>}</div>
        <div className="flex shrink-0 flex-wrap gap-2"><Link to={`/auctions/${bid.auction_id}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:border-cyan-400/40">View auction <ArrowUpRight size={14} /></Link>{bid.conversation_id && ["won"].includes(bid.state) && <Link to={`/chats/${bid.conversation_id}`} className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950">Pickup chat</Link>}</div>
      </article>;
    })}</div>}
    <div className="mt-7 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-amber-100/75">Bids cannot be withdrawn. If you win, pay cash at the item pickup; no online payment is processed.</div>
  </div></PageShell>;
};

export default MyBidsPage;
