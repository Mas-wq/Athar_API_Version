import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { AlertTriangle, ArrowLeft, Clock3, Gavel, ImageOff, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../lib/api";
import { formatCountdown } from "../lib/auction";
import { useAuth } from "../context/auth.context";
import { AccessCard, LoadingState } from "../components/ui";
import { PageShell } from "../components/layout";

const normalize = (value) => String(value || "").trim().toLocaleLowerCase().replace(/\s+/g, " ");

const AuctionDetailsPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [auction, setAuction] = useState(null);
  const [lostReportId, setLostReportId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(Date.now());

  const loadAuction = useCallback(async () => {
    try {
      const { data } = await api.get(`/items/auctions/${id}`);
      setAuction(data.data);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load this auction");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAuction();
    const poll = window.setInterval(loadAuction, 10000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearInterval(poll); window.clearInterval(clock); };
  }, [loadAuction]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "USER" || !auction?.found_item?.item_type) return;
    let active = true;
    api.get("/user/lost-reports")
      .then(({ data }) => {
        const itemType = normalize(auction.found_item.item_type);
        const match = (data.lostReports || []).find((report) => report.status === "OPEN" && normalize(report.item_type) === itemType);
        if (active) setLostReportId(match?.id || "");
      })
      .catch(() => { if (active) setLostReportId(""); });
    return () => { active = false; };
  }, [auction?.found_item?.item_type, isAuthenticated, user?.id, user?.role]);

  const minimumBid = useMemo(() => auction
    ? (auction.bid_count > 0 ? auction.current_price + auction.min_increment : auction.start_price)
    : 0, [auction]);
  const isOpen = auction?.status === "OPEN" && new Date(auction.ends_at).getTime() > now;
  const publicDetails = auction?.found_item?.public_details;
  const details = publicDetails && typeof publicDetails === "object" && !Array.isArray(publicDetails)
    ? Object.entries(publicDetails).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value) && String(value).trim())
    : [];

  const askToConfirm = (event) => {
    event.preventDefault();
    if (!Number.isSafeInteger(Number(amount)) || Number(amount) < minimumBid) {
      toast.error(`The minimum next bid is ${minimumBid} EGP`, { theme: "dark" });
      return;
    }
    setConfirming(true);
  };

  const placeBid = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/user/auctions/${id}/bids`, { amount: Number(amount) });
      toast.success("Your bid was recorded", { theme: "dark" });
      setConfirming(false);
      setAmount("");
      await loadAuction();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Could not place your bid", { theme: "dark" });
      setConfirming(false);
      await loadAuction();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageShell><LoadingState label="Loading auction details..." /></PageShell>;
  if (!auction) return <PageShell containerClassName="max-w-3xl"><div className="py-20 text-center"><p className="mb-5 text-rose-300">{error || "Auction not found"}</p><Link to="/auctions" className="font-bold text-cyan-300">Back to auctions</Link></div></PageShell>;

  const item = auction.found_item;
  const image = Array.isArray(item.image_urls) ? item.image_urls[0] : null;

  return (
    <PageShell containerClassName="max-w-5xl">
      <div className="py-10">
        <Link to="/auctions" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white"><ArrowLeft size={16} />All auctions</Link>
        {error && <p role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}
        {auction.viewer_state && <div className={`mb-4 rounded-xl border p-3 text-sm font-bold ${auction.viewer_state === "leading" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : auction.viewer_state === "outbid" ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-slate-700 bg-slate-900 text-slate-300"}`}>Your status: {auction.viewer_state}</div>}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
            <div className="relative aspect-[16/10] bg-slate-950">{image ? <img src={image} alt={item.item_type} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-600"><ImageOff size={42} /></div>}<span className="absolute start-4 top-4 rounded-full border border-cyan-300/30 bg-slate-950/80 px-3 py-1 text-xs font-bold text-cyan-200">{auction.status.replaceAll("_", " ")}</span></div>
            <div className="p-6 md:p-8">
              <h1 dir="auto" className="text-3xl font-semibold text-white">{item.item_type}</h1>
              <p dir="auto" className="mt-2 text-slate-400">{item.location_found || "Location not listed"}</p>
              <h2 className="mt-8 text-sm font-bold text-slate-200">Public description</h2>
              {details.length ? <dl className="mt-3 grid gap-3 sm:grid-cols-2">{details.map(([key, value]) => <div key={key} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"><dt className="text-xs text-slate-500">{key}</dt><dd dir="auto" className="mt-1 break-words text-sm text-slate-200">{String(value)}</dd></div>)}</dl> : <p className="mt-3 text-sm text-slate-500">No additional public details.</p>}
              {lostReportId && <Link to={`/claim/${item.id}?reportId=${lostReportId}`} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200 hover:bg-emerald-500/15"><ShieldCheck size={16} />I lost an item like this — submit an ownership claim</Link>}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <p className="text-xs font-bold text-cyan-300">CURRENT HIGHEST BID</p>
              <p className="mt-2 text-4xl font-semibold text-white">{auction.current_price} <span className="text-lg text-slate-400">EGP</span></p>
              <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-slate-500">Bids</p><p className="mt-1 font-bold text-white">{auction.bid_count}</p></div><div className="rounded-xl bg-white/[0.04] p-3"><p className="text-xs text-slate-500">Time left</p><p className="mt-1 inline-flex items-center gap-1 font-bold text-cyan-200"><Clock3 size={14} />{formatCountdown(auction.ends_at, now)}</p></div></div>
              {isOpen && isAuthenticated && user?.role === "USER" ? <form onSubmit={askToConfirm} className="mt-6 space-y-3"><label htmlFor="bid-amount" className="block text-sm font-bold text-white">Your bid (whole EGP)</label><p className="text-xs text-slate-400">Minimum next bid: {minimumBid} EGP</p><div className="flex items-center gap-2"><input id="bid-amount" type="number" inputMode="numeric" min={minimumBid} step="1" max="100000000" value={amount} onChange={(event) => setAmount(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder={String(minimumBid)} /><button disabled={busy || !amount} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50"><Gavel size={16} />Bid</button></div><p className="text-xs text-slate-500">Bids are binding and cannot be withdrawn. Payment is cash at pickup.</p></form> : isOpen && !isAuthenticated ? <Link to="/login" className="mt-6 block rounded-xl bg-cyan-400 px-4 py-3 text-center font-bold text-slate-950">Sign in to bid</Link> : isOpen && user?.role !== "USER" ? <p className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-200">Only regular signed-in users can bid.</p> : <p className="mt-6 rounded-xl bg-slate-800 p-3 text-sm font-semibold text-slate-300">This auction is no longer accepting bids.</p>}
              {auction.pickup_deadline && <p className="mt-4 text-xs text-slate-500">Pickup deadline: {new Date(auction.pickup_deadline).toLocaleString()}</p>}
              {auction.final_price != null && <p className="mt-2 text-sm font-bold text-emerald-200">Final price: {auction.final_price} EGP</p>}
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-white">Bid history</h2><span className="text-xs text-slate-500">Anonymous</span></div>{auction.bid_history?.length ? <ol className="max-h-80 space-y-2 overflow-y-auto">{auction.bid_history.map((bid, index) => <li key={`${bid.created_at}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2"><div><p className="text-sm font-semibold text-slate-200">{bid.bidder_alias}</p><time className="text-[11px] text-slate-500">{new Date(bid.created_at).toLocaleString()}</time></div><span className="font-bold text-emerald-300">{bid.amount} EGP</span></li>)}</ol> : <p className="text-sm text-slate-500">No bids yet. Starting price: {auction.start_price} EGP.</p>}</section>
          </aside>
        </div>
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-amber-100/80"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300" /><p>Bids are binding and cannot be withdrawn. The winner must collect before the pickup deadline and pay the winning amount in cash at pickup. No online payment is processed.</p></div>
      </div>
      {confirming && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="bid-confirm-title" className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"><h2 id="bid-confirm-title" className="text-xl font-bold text-white">Confirm binding bid</h2><p className="mt-3 text-sm leading-6 text-slate-300">You are placing a bid of <strong className="text-cyan-200">{amount} EGP</strong>. Bids cannot be withdrawn. If you win, collect the item by the deadline and pay cash at pickup.</p><div className="mt-6 flex gap-3"><button type="button" disabled={busy} onClick={() => setConfirming(false)} className="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-bold text-slate-300">Go back</button><button type="button" disabled={busy} onClick={placeBid} className="flex-1 rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{busy ? "Submitting…" : "Confirm bid"}</button></div></section></div>}
    </PageShell>
  );
};

export default AuctionDetailsPage;
