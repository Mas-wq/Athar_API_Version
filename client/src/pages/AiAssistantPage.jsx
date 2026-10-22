import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Bot, ExternalLink, LoaderCircle, Send } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/auth.context";
import { AccessCard } from "../components/ui";
import { PageShell } from "../components/layout";

const CHAT_CACHE_VERSION = "empty-after-reset-v1";

const createStarterMessage = (fullName) => {
  const firstName = String(fullName || "").trim().split(/\s+/)[0];
  const greetingName = firstName || "there";
  return {
    role: "assistant",
    content: `Hi ${greetingName}! I’m your personal assistant for finding lost items. I can check your reports and look for things that may match. How can I help?`,
  };
};

const readCachedMessages = (key) => {
  try {
    const messages = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(messages)
      ? messages.filter((message) => message?.id && ["user", "assistant"].includes(message.role))
      : [];
  } catch {
    return [];
  }
};

const mergeMessages = (...groups) => {
  const byId = new Map();
  groups.flat().forEach((message) => {
    if (message?.id) byId.set(String(message.id), message);
  });
  return [...byId.values()]
    .sort((a, b) => {
      const timeDifference = new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (timeDifference) return timeDifference;
      if (a.role !== b.role) return a.role === "user" ? -1 : 1;
      return 0;
    })
    .slice(-100);
};

const AiAssistantPage = () => {
  const { isAuthenticated, user } = useAuth();
  const storageKey = "athar-ai-chat-" + (user?.id || "guest");
  const starterMessage = createStarterMessage(user?.full_name);
  const [messages, setMessages] = useState([starterMessage]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [historyLoadedFor, setHistoryLoadedFor] = useState(null);
  const messagesContainerRef = useRef(null);
  const previousStorageKeyRef = useRef(storageKey);

  useEffect(() => {
    let active = true;
    const sameUser = previousStorageKeyRef.current === storageKey;
    previousStorageKeyRef.current = storageKey;
    const cacheVersionKey = storageKey + "-cache-version";
    try {
      if (localStorage.getItem(cacheVersionKey) !== CHAT_CACHE_VERSION) {
        localStorage.removeItem(storageKey);
        localStorage.setItem(cacheVersionKey, CHAT_CACHE_VERSION);
      }
    } catch {
      // The server remains the primary history store if browser storage is unavailable.
    }
    const cachedMessages = isAuthenticated ? readCachedMessages(storageKey) : [];
    if (cachedMessages.length) setMessages([starterMessage, ...cachedMessages]);

    const loadMatchAlerts = async () => {
      try {
        const { data } = await api.get("/user/ai/matches");
        const alerts = Array.isArray(data.alerts) ? data.alerts : [];
        if (active && alerts.length) {
          setMessages((current) => {
            const merged = mergeMessages(current, alerts);
            return merged.length ? [starterMessage, ...merged] : current;
          });
        }
      } catch {
        // The assistant can still be used when there are no saved match alerts.
      }
    };

    if (isAuthenticated) {
      Promise.allSettled([
        api.get("/user/ai/chat-history"),
        api.get("/user/ai/matches"),
      ]).then(([historyResult, alertsResult]) => {
        if (!active) return;
        const history = historyResult.status === "fulfilled" && Array.isArray(historyResult.value.data.messages)
          ? historyResult.value.data.messages
          : [];
        const alerts = alertsResult.status === "fulfilled" && Array.isArray(alertsResult.value.data.alerts)
          ? alertsResult.value.data.alerts
          : [];
        setMessages((current) => {
          const merged = mergeMessages(cachedMessages, history, alerts, sameUser ? current : []);
          return [starterMessage, ...merged];
        });
        setHistoryLoadedFor(storageKey);
        if (historyResult.status === "rejected") {
          setError(historyResult.reason.response?.data?.message || "Could not load your saved Athar AI chat.");
        }
      });
      const timer = window.setInterval(loadMatchAlerts, 15000);
      return () => {
        active = false;
        window.clearInterval(timer);
      };
    }

    setHistoryLoadedFor(null);
    setMessages([starterMessage]);
    return () => { active = false; };
  }, [storageKey, isAuthenticated, starterMessage.content]);

  useEffect(() => {
    if (!isAuthenticated || historyLoadedFor !== storageKey) return;
    const savedMessages = messages
      .filter((message) => message.id && message.status !== "sending")
      .slice(-100);
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedMessages));
    } catch {
      // The server remains the primary history store if browser storage is unavailable.
    }
  }, [messages, storageKey, isAuthenticated, historyLoadedFor]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submitQuestion = async (text, draftId, isRetry = false) => {
    if (sending) return;
    setMessages((current) => isRetry
      ? current.map((message) => message.id === draftId ? { ...message, status: "sending" } : message)
      : [...current, {
        id: draftId,
        role: "user",
        content: text,
        status: "sending",
        created_at: new Date().toISOString(),
      }]);
    setSending(true);
    setError("");
    try {
      const { data } = await api.post("/user/ai/chat", { question: text });
      setMessages((current) => [...current.filter((message) => message.id !== draftId), data.user_message, data.assistant_message]);
    } catch (requestError) {
      setMessages((current) => current.map((message) => message.id === draftId
        ? { ...message, status: "failed" }
        : message));
      const message = requestError.response?.data?.message || "Athar AI is not available right now.";
      setError(`${message} Your message is still saved here. Use Retry below.`);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || sending) return;
    setQuestion("");
    void submitQuestion(text, `draft-${Date.now()}`);
  };

  const retryMessage = (message) => {
    if (!message?.id || message.status !== "failed" || sending) return;
    void submitQuestion(message.content, message.id, true);
  };

  if (!isAuthenticated) return <AccessCard icon={Bot} title="Sign in to use Athar AI" description="The assistant searches your own lost reports and currently available found items." />;

  return (
    <PageShell containerClassName="max-w-5xl">
      <div className="py-10">

        <section className="flex h-[70vh] min-h-[420px] max-h-[760px] flex-col overflow-hidden rounded-3xl surface">
          <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
            <div className="rounded-xl bg-emerald-400/10 border border-emerald-400/15 p-2 text-emerald-300"><Bot size={19} aria-hidden="true" /></div>
            <div><h2 className="font-semibold text-white">Athar AI Assistant</h2><p className="text-xs text-slate-500">Suggests possible matches. It does not prove ownership.</p></div>
          </div>
          <div ref={messagesContainerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
            {messages.map((message, index) => (
              <div key={message.id || (index + "-" + message.role)} className={"max-w-3xl rounded-2xl px-4 py-3 " + (message.role === "user" ? "ms-auto bg-gradient-to-br from-emerald-600 to-teal-700 text-white" : "border border-white/10 bg-white/[0.04] text-slate-100")}>
                <p dir="auto" className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                {message.role === "user" && message.status === "failed" && <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/20 pt-2 text-xs"><span className="text-white/80">Reply failed. Your message is saved.</span><button type="button" disabled={sending} onClick={() => retryMessage(message)} className="rounded-lg bg-white/15 px-2.5 py-1 font-semibold text-white hover:bg-white/25 disabled:opacity-50">Retry</button></div>}
                {message.hint && <p className="mt-1 text-xs text-slate-500">{message.hint}</p>}
                {message.matches?.length > 0 && <div className="mt-3 space-y-2">
                  {message.matches.map((match) => <Link key={(match.report_number || "report") + "-" + match.found_item_id + "-" + match.url} to={match.url} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 transition hover:border-emerald-400/40 sm:flex-row sm:items-start sm:justify-between">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-white">{match.item_type || "Found item"}</span><span className="block truncate text-xs text-slate-400">{match.location || "Location not listed"} · Report {match.report_number}</span>{match.match_reasons?.length > 0 && <span className="mt-2 block space-y-1 text-start text-[11px] leading-4 text-slate-400"><span className="block font-bold text-slate-300">Why this may match</span>{match.match_reasons.map((reason, reasonIndex) => <span key={reasonIndex} className="block">• {reason}</span>)}</span>}</span>
                    <span className="flex shrink-0 items-center gap-1 self-end text-xs font-bold text-emerald-300 sm:self-auto">{match.match_percentage}% · View post <ExternalLink size={13} /></span>
                  </Link>)}
                </div>}
              </div>
            ))}
            {sending && <div className="flex items-center gap-2 text-sm text-slate-400"><LoaderCircle size={16} className="animate-spin" />Checking your reports and found items…</div>}
          </div>
          {error && <p role="alert" className="px-5 pb-2 text-sm text-rose-300">{error}</p>}
          <form onSubmit={sendMessage} className="flex gap-3 border-t border-white/[0.07] p-4">
            <input aria-label="Message to Athar AI" dir="auto" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1500} placeholder="Ask me: Did you find anything like my lost watch?" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/70 focus:bg-white/[0.06]" />
            <button disabled={sending || !question.trim()} type="submit" aria-label="Send message" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"><Send size={17} /><span className="hidden sm:inline">Send</span></button>
          </form>
        </section>
        <p className="mt-3 text-xs text-slate-500">Your Athar AI chat and match alerts are saved to your account and available across browsers.</p>
      </div>
    </PageShell>
  );
};

export default AiAssistantPage;
