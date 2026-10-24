import React from "react";
import { Link } from "react-router";
import {
  Search,
  Package,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  Building2,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "../assets/hero.jpg";
import { useAuth } from "../context/auth.context";
import { PageShell } from "../components/layout";

// One orchestrated entrance for the hero; everything else stays still.
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] },
  }),
};

const HomePage = () => {
  const { user } = useAuth();

  return (
    <PageShell variant="wide" containerClassName="max-w-7xl">
      {/* Hero */}
      <section className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 pt-8 pb-16 lg:pt-14 lg:pb-24">
        <div>
          <motion.div
            variants={rise}
            initial="hidden"
            animate="show"
            custom={0}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-1.5 ps-2 pe-4  mb-7"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15">
              <ShieldCheck size={14} className="text-emerald-300" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-slate-200">
              Trusted Lost & Found Network
            </span>
          </motion.div>

          <motion.h1
            variants={rise}
            initial="hidden"
            animate="show"
            custom={1}
            className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white tracking-[-0.035em] leading-[1.04] mb-6"
          >
            Lost it? We’ll help <span className="brand-text">find it.</span>
          </motion.h1>

          <motion.p
            variants={rise}
            initial="hidden"
            animate="show"
            custom={2}
            className="text-lg text-slate-300 max-w-xl leading-relaxed mb-10"
          >
            The most reliable platform in Egypt for reuniting owners with
            their lost belongings through verified community reporting.
          </motion.p>

          <motion.div
            variants={rise}
            initial="hidden"
            animate="show"
            custom={3}
            className="flex flex-wrap items-center gap-3"
          >
            {user && (user.role === "ADMIN" || user.role === "USER") && (
              <Link
                to="/found-items"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold rounded-xl transition-colors shadow-[0_10px_30px_-12px_rgb(63_214_189/0.7)] active:scale-[0.98]"
              >
                <Search size={18} aria-hidden="true" />
                Find My Item
              </Link>
            )}

            <Link
              to="/lost-reports"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-7 py-3.5 font-semibold text-white transition-colors hover:bg-white/[0.1] hover:border-white/25 active:scale-[0.98]"
            >
              <Search size={18} aria-hidden="true" />
              Browse Lost Reports
            </Link>

            {user && user.role === "USER" && (
              <Link
                to="/report-lost-item"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-slate-200 font-semibold rounded-xl hover:bg-white/[0.06] transition-colors active:scale-[0.98]"
              >
                <Package size={18} aria-hidden="true" />
                Report a Loss
              </Link>
            )}
          </motion.div>
        </div>

        {/* Hero image: the existing asset, framed and cooled to sit with the brand */}
        <motion.div
          variants={rise}
          initial="hidden"
          animate="show"
          custom={2}
          className="relative"
        >
          <div className="relative aspect-[4/4.2] sm:aspect-[16/11] lg:aspect-[4/4.6] overflow-hidden rounded-[1.75rem] border border-white/10 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)]">
            <img
              src={heroImage}
              alt="Signpost pointing to Lost, Found and Searching"
              className="absolute inset-0 h-full w-full object-cover object-[18%_70%] saturate-[0.8]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-transparent to-teal-600/25 mix-blend-soft-light" />
          </div>

          {/* Honest framing for the AI: suggestions, not decisions */}
          <div className="absolute -bottom-6 start-4 end-4 sm:start-auto sm:end-6 sm:max-w-xs surface rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] border border-white/10">
                <Sparkles size={15} className="text-emerald-300" aria-hidden="true" />
              </span>
              <p className="text-sm leading-relaxed text-slate-300">
                Athar AI suggests possible matches. People review them and make the final call.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Why Athar */}
      <section aria-label="Why Athar" className="pt-10 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            icon={<CheckCircle2 size={20} aria-hidden="true" />}
            title="Verified Ownership"
            desc="Our team ensures claims are backed by proof, preventing unauthorized pickups."
          />
          <InfoCard
            icon={<Clock size={20} aria-hidden="true" />}
            title="Real-time Alerts"
            desc="Get instant notifications when an item matching your description is logged."
          />
          <InfoCard
            icon={<Building2 size={20} aria-hidden="true" />}
            title="Partner Hubs"
            desc="Available at major airports, train stations, and shopping malls nationwide."
          />
        </div>
      </section>

      {/* How it works (a real sequence, so it is numbered) */}
      <section aria-labelledby="how-title" className="pt-20 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <h2 id="how-title" className="text-3xl sm:text-4xl font-semibold text-white tracking-tight max-w-md">
            From missing to returned, in three steps
          </h2>
          <Link
            to="/how-it-works"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300 hover:text-emerald-200 transition-colors"
          >
            See how it works
            <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Package,
              title: "Report it",
              desc: "Describe what was lost or found and add photos so others can recognise it.",
            },
            {
              icon: Sparkles,
              title: "Review matches",
              desc: "Athar compares reports and found items, then shows possible matches for you to check.",
            },
            {
              icon: MessageSquare,
              title: "Claim and hand over",
              desc: "Answer the ownership questions, then arrange the handover with the finder in chat.",
            },
          ].map((step, i) => {
            const StepIcon = step.icon;
            const { title, desc } = step;
            return (
            <li key={title} className="surface rounded-2xl p-6">
              <div className="flex items-center justify-between mb-8">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] border border-white/10">
                  <StepIcon size={18} className="text-emerald-300" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-slate-500 tabular-nums">{i + 1} / 3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
            </li>
            );
          })}
        </ol>
      </section>
    </PageShell>
  );
};

const InfoCard = ({ icon, title, desc }) => (
  <div className="surface rounded-2xl p-6 transition-colors hover:border-white/20">
    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 border border-emerald-400/15">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-white mb-1.5">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

export default HomePage;
