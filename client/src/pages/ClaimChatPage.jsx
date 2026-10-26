import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Check, Loader, MessageCircle, Send, CalendarDays, ShieldAlert, MapPin, Download, ExternalLink } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../lib/api";
import { useAuth } from "../context/auth.context";
import { AccessCard, LoadingState } from "../components/ui";
import { PageShell } from "../components/layout";
import { QRCodeSVG } from "qrcode.react";

const ClaimChatPage = () => {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [chat, setChat] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [meetingPlace, setMeetingPlace] = useState("");
  const [meetingAt, setMeetingAt] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const bottomRef = useRef(null);

  const fetchChat = useCallback(async (showError = false) => {
    try {
      const { data } = await api.get(`/chat/conversations/${id}`);
      setChat(data.data);
      if (document.visibilityState === "visible") {
        const lastMessage = data.data.messages?.at(-1);
        await api.post(`/chat/conversations/${id}/read`, { message_id: lastMessage?.id });
        window.dispatchEvent(new Event("athar:unread-refresh"));
      }
    } catch (error) {
      if (showError) toast.error(error.response?.data?.message || "Could not load this chat");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchChat(true);
    const timer = window.setInterval(() => fetchChat(false), 5000);
    return () => window.clearInterval(timer);
  }, [fetchChat, isAuthenticated]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages?.length]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setBusy(true);
    try {
      await api.post(`/chat/conversations/${id}/messages`, { message });
      setDraft("");
      await fetchChat();
    } catch (error) { toast.error(error.response?.data?.message || "Could not send your message"); }
    finally { setBusy(false); }
  };

  const decide = async (decision) => {
    setBusy(true);
    try {
      await api.patch(`/chat/conversations/${id}/decision`, { decision });
      toast.success(decision === "ACCEPT" ? "Claim accepted. Chat is now open." : "Claim rejected. The lost report remains active.");
      await fetchChat();
    } catch (error) { toast.error(error.response?.data?.message || "Could not update claim"); }
    finally { setBusy(false); }
  };

  const createHandover = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post("/chat/conversations/" + id + "/handover", {
        meeting_place: meetingPlace,
        meeting_at: new Date(meetingAt).toISOString(),
      });
      toast.success("Handover plan added to the chat");
      setMeetingPlace("");
      setMeetingAt("");
      await fetchChat();
    } catch (error) { toast.error(error.response?.data?.message || "Could not create handover plan"); }
    finally { setBusy(false); }
  };

  const openMeetingPlaceInMaps = () => {
    const place = meetingPlace.trim();
    if (!place) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const confirmHandover = async () => {
    setBusy(true);
    try {
      await api.post("/chat/conversations/" + id + "/handover/confirm", { handover_code: confirmationCode });
      setConfirmationCode("");
      toast.success("Your confirmation was recorded");
      await fetchChat();
    } catch (error) { toast.error(error.response?.data?.message || "Could not confirm handover"); }
    finally { setBusy(false); }
  };

  const disputeHandover = async () => {
    setBusy(true);
    try {
      await api.post("/chat/conversations/" + id + "/handover/dispute");
      toast.success("Handover paused; the other person was notified in this chat");
      await fetchChat();
    } catch (error) { toast.error(error.response?.data?.message || "Could not report a handover issue"); }
    finally { setBusy(false); }
  };

  const confirmDisputeResolved = async () => {
    setBusy(true);
    try {
      await api.post("/chat/conversations/" + id + "/handover/resolve");
      toast.success("Your confirmation was recorded");
      await fetchChat();
    } catch (error) { toast.error(error.response?.data?.message || "Could not confirm issue resolution"); }
    finally { setBusy(false); }
  };

  const downloadHandoverQr = () => {
    const svg = document.getElementById("athar-handover-qr");
    if (!svg) return;
    const markup = new XMLSerializer().serializeToString(svg);
    const file = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "athar-handover-" + reportNumber + ".svg";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!isAuthenticated) return <AccessCard icon={MessageCircle} title="Sign in to open this chat" description="Only the report owner and the person who found this item can participate." />;
  if (loading) return <PageShell><LoadingState label="Opening chat..." /></PageShell>;
  if (!chat) return <PageShell><div className="mx-auto max-w-2xl py-20 text-center text-slate-400">This chat could not be found.</div></PageShell>;

  const { conversation, found_item: foundItem, report_number: reportNumber, viewer_role: viewerRole, handover, auction } = chat;
  const isAuction = conversation.kind === "AUCTION";
  const currentUserId = String(user?.id || "");
  const isFinder = currentUserId
    ? currentUserId === String(conversation.finder_id || "")
    : viewerRole === "FINDER";
  const isClaimant = currentUserId
    ? currentUserId === String(conversation.claimant_id || "")
    : viewerRole === "CLAIMANT";
  const status = conversation.status;
  const claimId = chat.claim?.id;
  const displayedScore = claimId ? chat.claim?.match_percentage : conversation.match_percentage;
  const claimVerificationPending = chat.claim?.verification_status === "PENDING";
  const claimVerificationFailed = chat.claim?.verification_status === "FAILED";
  const topLink = isAuction ? `/auctions/${conversation.auction_id}` : claimId ? `/claims/${claimId}` : `/found-items?item=${foundItem.id}`;
  const topLinkLabel = isAuction ? "View auction" : claimId ? "View claim" : "View found post";
  const canMessage = status === "ACCEPTED";
  const handoverReportDetails = Object.entries(chat.lost_report?.report_details || {})
    .filter(([key, value]) => !/(secret|hidden|private|password|email|phone|contact|proof|address)/i.test(key) && value)
    .slice(0, 3);

  return (
    <PageShell containerClassName="max-w-4xl">
      <div className="py-8">
        <Link to="/chats" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16} /> All chats</Link>
        <section className="overflow-hidden rounded-3xl surface">
          <header className="flex flex-wrap items-center gap-4 border-b border-slate-800 p-5">
            {foundItem.image_urls?.[0] ? <img src={foundItem.image_urls[0]} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 text-emerald-400"><MessageCircle /></div>}
            <div className="min-w-0 flex-1"><h1 className="text-lg font-bold text-white">{foundItem.item_type}</h1><p className="text-sm text-slate-400">Report {reportNumber} · {foundItem.location_found}</p></div>
            {!isAuction && <div className="text-end"><p className="text-lg font-semibold text-emerald-400">{displayedScore == null || displayedScore < 0 ? "Checking…" : `${displayedScore}%`}</p><p className="text-[11px] text-slate-500">{claimId ? "Ownership answers" : "AI match"}</p></div>}
            <span className="rounded-full bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-300">{String(status || "SUGGESTED").replaceAll("_", " ")}</span>
          </header>

          {isAuction && <div className="border-b border-amber-400/20 bg-amber-500/10 px-5 py-4"><p className="font-bold text-amber-100">Auction win · {auction?.final_price ?? conversation.final_price ?? "—"} EGP</p><p className="mt-1 text-sm text-amber-100/75">Arrange pickup in this chat. Pay the winning amount in CASH at pickup; Athar does not process online payments.</p>{auction?.pickup_deadline && <p className="mt-1 text-xs text-amber-100/60">Collect by {new Date(auction.pickup_deadline).toLocaleString()}.</p>}</div>}

          <div className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/30 px-5 py-3">
            <span className="text-xs text-slate-400">{isAuction ? "This private chat is for arranging the auction pickup." : claimId ? "Review the claimant’s AI ownership answers and evidence." : "The person who found the item reviews ownership claims."}</span>
            <Link to={topLink} className="shrink-0 text-xs font-bold text-emerald-400 hover:text-emerald-300">{topLinkLabel}</Link>
          </div>

          <div className="h-[52vh] min-h-72 space-y-4 overflow-y-auto p-5">
            {(Array.isArray(chat.messages) ? chat.messages : []).map((entry) => {
              const own = entry.sender_id === user?.id;
              const assistant = entry.sender_name === "Athar AI Assistant";
              const hasFoundPostLink = assistant && /\/found-items\?item=/.test(entry.message);
              const messageText = hasFoundPostLink
                ? entry.message.replace(/https?:\/\/\S+/, "").trim()
                : entry.message;
              return <div key={entry.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${own ? "rounded-ee-sm bg-emerald-600 text-white" : assistant ? "rounded-es-sm border border-teal-400/20 bg-teal-500/10 text-teal-50" : "rounded-es-sm bg-white/[0.07] text-slate-100"}`}>
                  <p className="mb-1 text-[11px] font-bold opacity-70">{own ? "You" : entry.sender_name}</p>
                  <p dir="auto" className="whitespace-pre-wrap break-words text-sm">{messageText}{hasFoundPostLink && <> <Link to={`/found-items?item=${foundItem.id}`} className="font-bold underline underline-offset-2 text-teal-200 hover:text-teal-100">Open found post</Link></>}</p>
                  <time className="mt-2 block text-end text-[11px] opacity-60">{new Date(entry.created_at).toLocaleString()}</time>
                </div>
              </div>;
            })}
            <div ref={bottomRef} />
          </div>

          {isClaimant && status === "SUGGESTED" && <div className="border-t border-slate-800 p-4"><Link to={`/claim/${foundItem.id}?reportId=${chat.lost_report.id}`} className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 hover:bg-emerald-400">This is my item — submit claim</Link></div>}
          {isFinder && status === "PENDING_FINDER" && <div className="space-y-3 border-t border-slate-800 p-4">{claimVerificationPending && <p className="text-center text-sm text-slate-400">Athar AI is calculating the ownership evidence score. The decision buttons will be ready shortly.</p>}{claimVerificationFailed && <p className="text-center text-sm text-amber-300">Athar AI could not calculate a score. You can review the claim manually.</p>}<div className="flex gap-3"><button disabled={busy || claimVerificationPending} onClick={() => decide("REJECT")} className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-bold text-rose-300 disabled:opacity-50">Reject claim</button><button disabled={busy || claimVerificationPending} onClick={() => decide("ACCEPT")} className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50"><Check className="me-2 inline" size={16} />Accept claim</button></div></div>}
          {isClaimant && status === "PENDING_FINDER" && <div className="border-t border-slate-800 p-4 text-center text-sm text-slate-400">Your claim was sent. Waiting for the person who found the item to review it.</div>}
          {isClaimant && status === "PENDING_OWNER" && <div className="flex gap-3 border-t border-slate-800 p-4"><button disabled={busy} onClick={() => decide("REJECT")} className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-bold text-rose-300 disabled:opacity-50">Reject request</button><button disabled={busy} onClick={() => decide("ACCEPT")} className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50"><Check className="me-2 inline" size={16} />Accept request</button></div>}
          {isFinder && status === "PENDING_OWNER" && <div className="border-t border-slate-800 p-4 text-center text-sm text-slate-400">Your found-item request was sent. Waiting for the lost report owner to review it.</div>}
          {canMessage && <form onSubmit={sendMessage} className="flex gap-3 border-t border-slate-800 p-4"><input aria-label="Message" dir="auto" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="Message the other person to arrange the handoff..." className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" /><button type="submit" disabled={!draft.trim() || busy} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 font-bold text-slate-950 disabled:opacity-40">{busy ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}<span className="hidden sm:inline">Send</span></button></form>}
          {!canMessage && !["PENDING_FINDER", "PENDING_OWNER", "SUGGESTED"].includes(status) && <div className="border-t border-slate-800 p-4 text-center text-sm text-slate-400">{status === "DELIVERED" ? "Delivered to owner" : status === "REJECTED" ? "This request was rejected. The lost report remains active." : "Chat opens when the request is accepted."}</div>}
          {status === "ACCEPTED" && !handover && <form onSubmit={createHandover} className="space-y-3 border-t border-slate-800 p-4">
            <p className="text-sm font-bold text-white">Plan a safe handover</p>
            <p className="text-xs text-slate-400">Choose a public place. Open it in Google Maps, then set a time. After meeting, both people confirm from their own accounts.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3"><MapPin size={16} className="shrink-0 text-emerald-400" /><input required maxLength={240} value={meetingPlace} onChange={(e) => setMeetingPlace(e.target.value)} placeholder="Public meeting place" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none" /></label>
                <button type="button" onClick={openMeetingPlaceInMaps} disabled={!meetingPlace.trim()} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 px-3 text-xs font-bold text-slate-200 hover:border-emerald-500 disabled:opacity-40"><ExternalLink size={15} />Map</button>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3"><CalendarDays size={16} className="text-emerald-400" /><input required type="datetime-local" value={meetingAt} onChange={(e) => setMeetingAt(e.target.value)} className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none" /></label>
            </div>
            <button disabled={busy || !meetingPlace || !meetingAt} className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">Create handover plan</button>
          </form>}
          {status === "ACCEPTED" && handover && <div className="space-y-3 border-t border-slate-800 p-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
              <p className="font-bold text-white">Handover · {String(handover.status).replaceAll("_", " ")}</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-300"><MapPin size={14} className="text-emerald-400" /><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(handover.meeting_place)}`} target="_blank" rel="noreferrer" className="underline decoration-slate-600 underline-offset-2 hover:text-emerald-300">{handover.meeting_place}</a><ExternalLink size={13} /></p>
              <p className="mt-1 text-sm text-slate-300"><CalendarDays size={14} className="me-2 inline text-emerald-400" />{new Date(handover.meeting_at).toLocaleString()}</p>
              {handover.status === "REQUESTED" && <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-xs font-bold text-emerald-300">Temporary handover QR · expires {new Date(handover.expires_at).toLocaleString()}</p>
                <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  <div className="shrink-0 rounded-xl bg-white p-3"><QRCodeSVG id="athar-handover-qr" value={handover.qr_payload || handover.handover_code} size={168} level="M" includeMargin /></div>
                  <div className="min-w-0 text-sm text-slate-300">
                    <p className="font-bold text-white">{isAuction ? `Auction ${reportNumber} · ${auction?.final_price ?? conversation.final_price ?? "—"} EGP` : `Report ${reportNumber} · ${chat.lost_report?.item_type || foundItem.item_type}`}</p>
                    {!isAuction && <p className="mt-1">Lost at: {chat.lost_report?.location_lost || "—"}</p>}
                    <p>Found at: {foundItem.location_found}</p>
                    {!isAuction && handoverReportDetails.map(([key, value]) => <p key={key} className="mt-1">{key}: {String(value).slice(0, 60)}</p>)}
                    <p className="mt-2 text-xs text-slate-400">The QR contains the {isAuction ? "auction number and final price, " : "report number, public report details, "}found item details, meeting place and time, and the temporary verification code.</p>
                    <p className="mt-2 text-xs text-amber-300">Private verification details are not included. Each person scans the QR, then confirms from their own account.</p>
                  </div>
                </div>
                <button type="button" onClick={downloadHandoverQr} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:border-emerald-500"><Download size={14} />Download QR</button>
                <p className="mt-3 text-xs text-slate-400">Readable backup code</p><p className="mt-1 font-mono text-xl font-semibold text-emerald-300">{handover.handover_code}</p>
              </div>}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300"><span>Owner: {handover.claimant_confirmed_at ? "confirmed" : "waiting"}</span><span>Finder: {handover.finder_confirmed_at ? "confirmed" : "waiting"}</span></div>
              {handover.status === "AWAITING_FINALIZATION" && <p className="mt-2 text-xs text-amber-300">Objection period ends {new Date(handover.objection_until).toLocaleString()}.</p>}
              {handover.status === "COMPLETED" && <p className="mt-3 font-bold text-emerald-300">{isAuction ? "Item collected · cash payment confirmed at pickup" : "Delivered to owner · both people confirmed"}</p>}
              {handover.status === "DISPUTED" && <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <p className="flex items-center gap-2 text-sm text-rose-300"><ShieldAlert size={16} />Completion is paused. Once the issue is resolved, both people must confirm below to restart the handover.</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300"><span>Owner: {handover.dispute_claimant_confirmed_at ? "confirmed resolution" : "waiting"}</span><span>Finder: {handover.dispute_finder_confirmed_at ? "confirmed resolution" : "waiting"}</span></div>
              </div>}
              {handover.status === "EXPIRED" && <p className="mt-3 text-sm text-amber-300">This plan expired. Create a new handover plan.</p>}
            </div>
            {handover.status === "REQUESTED" && !(isClaimant ? handover.claimant_confirmed_at : handover.finder_confirmed_at) && <div className="space-y-2">
              <label className="block text-xs text-slate-400">Scan the QR to check the report details, then enter its temporary code to confirm</label>
              <input value={confirmationCode} onChange={(event) => setConfirmationCode(event.target.value.toUpperCase())} maxLength={12} placeholder="12-character handover code" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-white outline-none focus:border-emerald-500" />
              <button disabled={busy || confirmationCode.trim().length !== 12} onClick={confirmHandover} className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">Confirm handover from my account</button>
            </div>}
            {handover.status === "DISPUTED" && !(isClaimant ? handover.dispute_claimant_confirmed_at : handover.dispute_finder_confirmed_at) && <button disabled={busy} onClick={confirmDisputeResolved} className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">Issue resolved · agree to resume handover</button>}
            {["REQUESTED", "AWAITING_FINALIZATION"].includes(handover.status) && <button disabled={busy} onClick={disputeHandover} className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-bold text-rose-300 disabled:opacity-50">Report a problem · pause completion</button>}
          </div>}
        </section>
      </div>
    </PageShell>
  );
};

export default ClaimChatPage;


