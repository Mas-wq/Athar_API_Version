import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { MessageCircle, Package, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/auth.context";
import { AccessCard, EmptyState, LoadingState } from "../components/ui";
import { PageShell } from "../components/layout";

const ChatsPage = () => {
  const { isAuthenticated } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let mounted = true;
    const loadChats = () => api.get("/chat/conversations")
      .then(({ data }) => { if (mounted) setChats(data.data || []); })
      .catch(() => { if (mounted) setChats([]); })
      .finally(() => { if (mounted) setLoading(false); });
    loadChats();
    const timer = window.setInterval(loadChats, 5000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [isAuthenticated]);

  if (!isAuthenticated) return <AccessCard icon={MessageCircle} title="Sign in to view your chats" description="Claim conversations appear here after a claim is submitted." />;
  return (
    <PageShell containerClassName="max-w-5xl">
      <div className="py-12">
        <p className="mb-3 text-xs font-bold text-emerald-400">Athar Inbox</p>
        <h1 className="mb-3 text-4xl font-semibold text-white">Chats</h1>
        <p className="mb-8 text-slate-400">Claim conversations with the person who found or claimed an item.</p>
        {loading ? <LoadingState label="Loading your chats..." /> : chats.length === 0 ? (
          <EmptyState icon={MessageCircle} title="No chats yet" description="New match alerts appear in Athar AI. Conversations appear here after you submit a claim." />
        ) : <div className="space-y-4">{chats.map((chat) => (
          <Link key={chat.id} to={`/chats/${chat.id}`} className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-emerald-500/40">
            {chat.item_image ? <img src={chat.item_image} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-900 text-emerald-400"><Package /></div>}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-white">{chat.item_type}</h2><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300">{chat.match_percentage < 0 ? "Checking match…" : `${chat.match_percentage ?? 0}% match`}</span><span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300">{String(chat.status || "SUGGESTED").replaceAll("_", " ")}</span></div>
              <p className="mt-1 truncate text-sm text-slate-400">{chat.last_message || "No messages yet"}</p>
              <p className="mt-1 text-xs text-slate-600">{chat.report_number} · Chat with {chat.counterpart_name}</p>
            </div>
            <ArrowRight className="shrink-0 text-slate-500" />
          </Link>
        ))}</div>}
      </div>
    </PageShell>
  );
};

export default ChatsPage;

