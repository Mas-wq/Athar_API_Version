import React from "react";
import {
  Search,
  FileText,
  CheckCircle2,
  Package,
  UserCheck,
  BellRing,
  Cpu,
  ShieldCheck,
  ArrowRightLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageShell } from "../components/layout";

const HowItWorks = () => {
  return (
    <PageShell
      className="relative bg-transparent overflow-hidden"
      containerClassName="max-w-6xl"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 blur-[120px]" />
      </div>

      <div className="relative z-10 py-12 lg:py-20">
        {/* --- Header Section --- */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-6"
          >
            <ArrowRightLeft size={14} /> Seamless Recovery Flow
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-semibold text-white mb-6">
            Designed for <span className="text-emerald-400">Precision.</span>
          </h1>
          <p className="text-slate-400 text-lg font-medium">
            Athar utilizes a dual-path system powered by AI scoring to
            bridge the gap between losing an item and a verified collection.
          </p>
        </div>

        {/* --- Path 1: Lost Item Journey --- */}
        <section className="mb-24">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-px flex-1 bg-slate-800" />
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 whitespace-nowrap px-4">
              <Search className="text-emerald-400" /> The Lost Report Path
            </h2>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Logic Flow Connectors (Desktop Only) */}
            <div className="hidden md:block absolute top-1/2 start-0 w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent -translate-y-1/2 pointer-events-none" />

            <ProcessCard
              number="01"
              icon={<FileText size={24} />}
              title="Detailed Reporting"
              desc="Submit your report with public identifiers and private 'Hidden Proofs' that only the true owner would know."
              color="emerald"
            />
            <ProcessCard
              number="02"
              icon={<Cpu size={24} />}
              title="AI Score Match"
              desc="When a found post scores above 50%, Athar AI sends the lost-report owner a chat alert with the match score and a link to the post."
              color="emerald"
            />
            <ProcessCard
              number="03"
              icon={<CheckCircle2 size={24} />}
              title="Claim and Return"
              desc="The report owner submits a claim. The person who found the item accepts or rejects it, then both people can chat to arrange the handoff."
              color="emerald"
            />
          </div>
        </section>

        {/* --- Path 2: Found Item Journey --- */}
        <section className="mb-24">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-px flex-1 bg-slate-800" />
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 whitespace-nowrap px-4">
              <Package className="text-blue-400" /> The Found Asset Path
            </h2>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ProcessCard
              number="01"
              icon={<ShieldCheck size={24} />}
              title="Post a Found Item"
              desc="Any signed-in user can share a found item, add photos, and keep private verification details hidden from public listings."
              color="blue"
            />
            <ProcessCard
              number="02"
              icon={<BellRing size={24} />}
              title="Review the Claim"
              desc="The lost report owner submits a claim on a found item. The finder reviews the ownership details, then accepts or rejects it."
              color="blue"
            />
            <ProcessCard
              number="03"
              icon={<UserCheck size={24} />}
              title="Confirm Delivery"
              desc="After the direct handoff, both people confirm separately. A short objection window follows; only then does the system close the linked reports."
              color="blue"
            />
          </div>
        </section>

        <section className="mb-16 rounded-3xl border border-cyan-500/20 bg-cyan-950/20 p-7 md:p-10">
          <div className="mb-5 flex items-center gap-3"><Cpu className="text-cyan-300" /><h2 className="text-2xl font-semibold text-white">Athar AI Agent</h2></div>
          <p className="max-w-4xl text-sm leading-7 text-slate-300">Athar AI Agent helps connect lost and found reports by suggesting possible matches and preparing questions that help the finder review a claim. Its suggestions do not prove ownership or decide a claim; the finder and item owner review the evidence and confirm the handover together.</p>
        </section>

        {/* --- Bottom Feature Grid (High Contrast) --- */}
        <div className="p-8 md:p-16 rounded-[3rem] bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-2xl">
          <h2 className="text-3xl font-semibold mb-12 text-center">
            System Integrity Features
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureBox
              title="Privacy First"
              desc="Hidden details are never visible on public item pages; only the finder uses them to check ownership claims."
            />
            <FeatureBox
              title="Audit Trail"
              desc="Every status change (Open → Matched → Resolved) is timestamped and logged."
            />
            <FeatureBox
              title="Smart Alerts"
              desc="Athar AI match suggestions appear in Athar AI. Claim updates and conversations with the other person appear in Chats after a claim."
            />
            <FeatureBox
              title="Geo-Scoring"
              desc="Matches are weighted by precise location proximity to reduce false positives."
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
};

// --- Helper Components ---

const ProcessCard = ({ number, icon, title, desc, color }) => {
  const isEmerald = color === "emerald";
  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="relative p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md group"
    >
      <div
        className={`text-5xl font-semibold opacity-10 absolute top-4 end-6 transition-opacity group-hover:opacity-20 ${
          isEmerald ? "text-emerald-400" : "text-blue-400"
        }`}
      >
        {number}
      </div>
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
          isEmerald
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-950"
            : "bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-slate-950"
        }`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
        {title}
      </h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
};

const FeatureBox = ({ title, desc }) => (
  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:bg-white/20 transition-all">
    <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center mb-4">
      <CheckCircle2 size={18} className="text-emerald-300" />
    </div>
    <h4 className="font-bold mb-2 text-white">{title}</h4>
    <p className="text-emerald-50 text-xs leading-relaxed opacity-80">{desc}</p>
  </div>
);

export default HowItWorks;
