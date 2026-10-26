import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Gavel, Clock3, ImageOff, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { formatCountdown } from "../lib/auction";
import { PageShell } from "../components/layout";
import { EmptyState, LoadingState } from "../components/ui";

const AuctionsPage = () => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const loadAuctions = useCallback(async () => {
    try {
      const { data } = await api.get("/items/auctions");
      setAuctions(data.data || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load auctions. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuctions();
    const poll = window.setInterval(loadAuctions, 15000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearInterval(poll); window.clearInterval(clock); };
  }, [loadAuctions]);

  return (
    <PageShell containerClassName="max-w-6xl">
      <div className="py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-cyan-300"><Gavel size={15} /> ATHAR AUCTIONS</p><h1 className="text-4xl font-semibold text-white md:text-5xl">Find your next <span className="text-cyan-300">treasure.</span></h1><p className="mt-3 max-w-2xl text-slate-400">Bid on eligible found items. Bids are binding, and winners pay cash when they collect the item.</p></div>
          <button type="button" onClick={loadAuctions} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400/40"><RefreshCw size={15} />Refresh</button>
        </div>
        {error && <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"><span>{error}</span><button type="button" onClick={loadAuctions} className="font-bold underline">Retry</button></div>}
        {loading ? <LoadingState label="Loading open auctions..." /> : auctions.length === 0 ? <EmptyState icon={Gavel} title="No open auctions" description="New auctions will appear here after an eligible item receives its notice period." /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {auctions.map((auction) => {
              const item = auction.found_item;
              const image = Array.isArray(item.image_urls) ? item.image_urls[0] : null;
              return <Link key={auction.id} to={`/auctions/${auction.id}`} className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/75 transition hover:-translate-y-1 hover:border-cyan-400/40">
                <div className="relative aspect-[16/10] bg-slate-950">
                  {image ? <img src={image} alt={item.item_type} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-slate-600"><ImageOff size={30} /></div>}
                  <span className="absolute start-3 top-3 rounded-full border border-cyan-300/30 bg-slate-950/80 px-3 py-1 text-xs font-bold text-cyan-200">Open</span>
                </div>
                <div className="p-5">
                  <h2 dir="auto" className="truncate text-lg font-bold text-white">{item.item_type}</h2>
                  <p dir="auto" className="mt-1 truncate text-sm text-slate-400">{item.location_found || "Location not listed"}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"><p className="text-[11px] text-slate-500">Current bid</p><p className="mt-1 font-bold text-emerald-300">{auction.current_price} EGP</p></div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"><p className="text-[11px] text-slate-500">Bids</p><p className="mt-1 font-bold text-white">{auction.bid_count}</p></div>
                  </div>
                  <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-cyan-200"><Clock3 size={14} />{formatCountdown(auction.ends_at, now)} left</p>
                  <span className="mt-4 block rounded-xl bg-cyan-400 px-4 py-3 text-center text-sm font-bold text-slate-950 transition group-hover:bg-cyan-300">View auction</span>
                </div>
              </Link>;
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default AuctionsPage;
