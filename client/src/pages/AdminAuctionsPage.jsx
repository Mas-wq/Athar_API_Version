import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Gavel, RefreshCw, Save, Users, X } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../lib/api";
import { describeMinutes } from "../lib/auction";
import { useAuth } from "../context/auth.context";
import { AccessCard, LoadingState } from "../components/ui";
import { PageShell } from "../components/layout";

const MINUTE_FIELDS = new Set(["waiting_minutes", "notice_minutes", "duration_minutes", "anti_sniping_minutes", "pickup_minutes"]);
const ZERO_ALLOWED_FIELDS = new Set(["waiting_minutes", "notice_minutes", "anti_sniping_minutes"]);
const NUMBER_FIELDS = [
  ["waiting_minutes", "Waiting period (minutes)"],
  ["notice_minutes", "Finder notice (minutes)"],
  ["duration_minutes", "Auction duration (minutes)"],
  ["anti_sniping_minutes", "Anti-sniping extension (minutes)"],
  ["start_price", "Starting price (EGP)"],
  ["min_increment", "Minimum bid increment (EGP)"],
  ["pickup_minutes", "Winner pickup deadline (minutes)"],
  ["strike_limit", "Strike limit"],
  ["relist_start_price_percent", "Relisted start price (%)"],
];

const AdminAuctionsPage = () => {
  const { isAuthenticated, user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [excludedText, setExcludedText] = useState("");
  const [auctions, setAuctions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [reservePrice, setReservePrice] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/auction-settings");
      setSettings(data.data);
      setExcludedText((data.data.excluded_types || []).join("\n"));
    } catch (error) { toast.error(error.response?.data?.message || "Could not load auction settings", { theme: "dark" }); }
  }, []);

  const loadAuctions = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/auctions", { params: { status: statusFilter } });
      setAuctions(data.data || []);
    } catch (error) { toast.error(error.response?.data?.message || "Could not load auctions", { theme: "dark" }); }
  }, [statusFilter]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "ADMIN") { setLoading(false); return; }
    Promise.all([loadSettings(), loadAuctions()]).finally(() => setLoading(false));
  }, [isAuthenticated, user?.id, user?.role, loadSettings, loadAuctions]);

  const updateField = (field, value) => setSettings((current) => ({ ...current, [field]: value }));

  const saveSettings = async (event) => {
    event.preventDefault();
    if (saving || !settings) return;
    setSaving(true);
    const payload = {};
    for (const [field] of NUMBER_FIELDS) {
      payload[field] = Number(settings[field]);
    }
    payload.excluded_types = excludedText.split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
    payload.proceeds_note = settings.proceeds_note || "";
    try {
      const { data } = await api.put("/admin/auction-settings", payload);
      setSettings(data.data);
      setExcludedText((data.data.excluded_types || []).join("\n"));
      toast.success("Auction settings saved. Existing auctions keep their current rules.", { theme: "dark" });
    } catch (error) { toast.error(error.response?.data?.message || "Could not save settings", { theme: "dark" }); }
    finally { setSaving(false); }
  };

  const showAuctionBids = async (auctionId) => {
    setBusy(true);
    try {
      const { data } = await api.get(`/admin/auctions/${auctionId}`);
      setSelectedAuction(data.data);
      setReservePrice(data.data.auction.reserve_price ?? "");
    } catch (error) { toast.error(error.response?.data?.message || "Could not load auction bids", { theme: "dark" }); }
    finally { setBusy(false); }
  };

  const saveReservePrice = async () => {
    if (!selectedAuction || busy) return;
    const value = reservePrice === "" ? null : Number(reservePrice);
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/auctions/${selectedAuction.auction.id}/reserve`, { reserve_price: value });
      setSelectedAuction((current) => ({ ...current, auction: { ...current.auction, reserve_price: data.reserve_price } }));
      toast.success("Reserve price updated", { theme: "dark" });
      await loadAuctions();
    } catch (error) { toast.error(error.response?.data?.message || "Could not update reserve price", { theme: "dark" }); }
    finally { setBusy(false); }
  };

  const cancelAuction = async () => {
    if (!cancelTarget || busy) return;
    setBusy(true);
    try {
      await api.post(`/admin/auctions/${cancelTarget.id}/cancel`, { reason: cancelReason });
      toast.success("Auction cancelled and bidders notified", { theme: "dark" });
      setCancelTarget(null);
      setCancelReason("");
      await loadAuctions();
    } catch (error) { toast.error(error.response?.data?.message || "Could not cancel this auction", { theme: "dark" }); }
    finally { setBusy(false); }
  };

  if (!isAuthenticated || user?.role !== "ADMIN") return <AccessCard icon={Gavel} title="Admin access required" description="Auction settings and moderation tools are available to administrators." />;
  return <PageShell containerClassName="max-w-6xl"><div className="py-12">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold text-cyan-300">ATHAR ADMINISTRATION</p><h1 className="text-4xl font-semibold text-white">Auction control</h1><p className="mt-2 text-slate-400">Manage rules, review bids, and cancel auctions when needed.</p></div><Link to="/manage-users" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 hover:border-cyan-400/40"><Users size={16} />Manage strikes and users</Link></div>
    {loading ? <LoadingState label="Loading auction administration..." /> : <>
      {settings && <form onSubmit={saveSettings} className="mb-9 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 md:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-white">Auction settings</h2><p className="mt-1 text-xs text-slate-400">Saved settings apply to auctions created after the update. Existing auctions use their stored snapshots.</p></div><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"><Save size={16} />{saving ? "Saving…" : "Save settings"}</button></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{NUMBER_FIELDS.map(([field, label]) => <label key={field} className="block"><span className="text-xs font-semibold text-slate-300">{label}</span><input type="number" min={ZERO_ALLOWED_FIELDS.has(field) ? 0 : 1} step="1" value={settings[field] ?? ""} onChange={(event) => updateField(field, event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400" />{MINUTE_FIELDS.has(field) && <span className="mt-1 block text-[11px] text-slate-500">{describeMinutes(settings[field])} ({settings[field]} minutes)</span>}</label>)}</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="block"><span className="text-xs font-semibold text-slate-300">Excluded item keywords (one per line)</span><textarea rows={5} value={excludedText} onChange={(event) => setExcludedText(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400" /></label><label className="block"><span className="text-xs font-semibold text-slate-300">Proceeds note shown to administrators</span><textarea rows={5} maxLength={500} value={settings.proceeds_note || ""} onChange={(event) => updateField("proceeds_note", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400" /><span className="mt-1 block text-[11px] text-slate-500">No platform fee. Current note: {settings.proceeds_note || "Not set"}</span></label></div>
      </form>}

      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5"><div><h2 className="text-xl font-bold text-white">Auctions</h2><p className="mt-1 text-xs text-slate-500">{auctions.length} records in this view</p></div><div className="flex gap-2"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"><option value="ALL">All statuses</option>{["OPEN", "AWAITING_PICKUP", "SOLD", "CANCELLED", "UNSOLD"].map((status) => <option key={status}>{status}</option>)}</select><button type="button" onClick={loadAuctions} className="rounded-xl border border-slate-700 px-3 text-slate-300 hover:text-white" aria-label="Refresh auctions"><RefreshCw size={16} /></button></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-start"><thead><tr className="border-b border-slate-800 text-xs text-slate-500"><th className="px-5 py-3 text-start">Item</th><th className="px-5 py-3 text-start">Status</th><th className="px-5 py-3 text-start">Price / bids</th><th className="px-5 py-3 text-start">End / pickup</th><th className="px-5 py-3 text-start">Actions</th></tr></thead><tbody className="divide-y divide-slate-800/70">{auctions.map((row) => <tr key={row.id} className="align-top text-sm"><td className="px-5 py-4"><p className="font-bold text-white">{row.found_item.item_type}</p><p className="mt-1 text-xs text-slate-500">Finder: {row.finder_name}</p><p className="text-xs text-slate-600">{row.id.slice(0, 8)}</p></td><td className="px-5 py-4"><span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-200">{row.status.replaceAll("_", " ")}</span></td><td className="px-5 py-4 text-slate-300">{row.current_price} EGP<p className="mt-1 text-xs text-slate-500">{row.bid_count} bids · start {row.start_price} EGP · reserve {row.reserve_price ?? "none"}</p></td><td className="px-5 py-4 text-xs text-slate-400">{row.status === "AWAITING_PICKUP" ? row.pickup_deadline ? new Date(row.pickup_deadline).toLocaleString() : "—" : new Date(row.ends_at).toLocaleString()}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => showAuctionBids(row.id)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:border-cyan-400/40">View bids / reserve</button>{["OPEN", "AWAITING_PICKUP"].includes(row.status) && <button type="button" onClick={() => setCancelTarget(row)} className="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/10">Cancel</button>}</div></td></tr>)}</tbody></table></div>
        {auctions.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No auctions match this filter.</p>}
      </section>
    </>}
  </div>

    {selectedAuction && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4"><section role="dialog" aria-modal="true" aria-labelledby="admin-auction-bids-title" className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5"><div className="mb-4 flex items-center justify-between"><div><h2 id="admin-auction-bids-title" className="text-xl font-bold text-white">Auction bids</h2><p className="mt-1 text-xs text-slate-500">{selectedAuction.found_item.item_type} · {selectedAuction.auction.status}</p></div><button type="button" onClick={() => setSelectedAuction(null)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button></div><div className="mb-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><label className="block text-xs font-semibold text-slate-300">Per-auction reserve price (EGP, optional)<input type="number" min="1" step="1" disabled={selectedAuction.auction.status !== "OPEN"} value={reservePrice} onChange={(event) => setReservePrice(event.target.value)} placeholder="No reserve" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white disabled:opacity-50" /></label><p className="mt-2 text-[11px] text-slate-500">Bids stay anonymous to the public. Admins can review bidder details here.</p><button type="button" disabled={busy || selectedAuction.auction.status !== "OPEN"} onClick={saveReservePrice} className="mt-3 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">{busy ? "Saving…" : "Save reserve price"}</button></div>{selectedAuction.bids.length ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead><tr className="border-b border-slate-700 text-xs text-slate-500"><th className="py-2 text-start">Bidder</th><th className="py-2 text-start">Amount</th><th className="py-2 text-start">State</th><th className="py-2 text-start">Placed</th></tr></thead><tbody className="divide-y divide-slate-800">{selectedAuction.bids.map((bid) => <tr key={bid.id}><td className="py-3 text-slate-200">{bid.bidder.full_name}<p className="text-xs text-slate-500">{bid.bidder.email}{bid.bidder.phone ? ` · ${bid.bidder.phone}` : ""}</p></td><td className="py-3 font-bold text-emerald-200">{bid.amount} EGP</td><td className="py-3 text-slate-300">{bid.status}</td><td className="py-3 text-xs text-slate-500">{new Date(bid.created_at).toLocaleString()}</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-slate-400">No bids on this auction.</p>}</section></div>}
    {cancelTarget && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="cancel-auction-title" className="w-full max-w-md rounded-3xl border border-rose-500/20 bg-slate-900 p-6"><h2 id="cancel-auction-title" className="text-xl font-bold text-white">Cancel this auction?</h2><p className="mt-2 text-sm text-slate-400">All bidders will be notified. The item returns to found items and opts out of future auctions.</p><label className="mt-4 block text-sm font-semibold text-slate-300">Reason<textarea required maxLength={500} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-rose-400" /></label><div className="mt-5 flex gap-3"><button type="button" disabled={busy} onClick={() => { setCancelTarget(null); setCancelReason(""); }} className="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-bold text-slate-300">Keep auction</button><button type="button" disabled={busy || !cancelReason.trim()} onClick={cancelAuction} className="flex-1 rounded-xl bg-rose-500 px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? "Cancelling…" : "Confirm cancel"}</button></div></section></div>}
  </PageShell>;
};

export default AdminAuctionsPage;
