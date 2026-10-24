import React from "react";
import {
  Users,
  Target,
  Award,
  Heart,
  ShieldCheck,
  Cpu,
  BellRing,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageShell } from "../components/layout";

const AboutPage = () => {
  return (
    <PageShell
      className="relative bg-transparent overflow-hidden" // Matching Home Page deep slate
      containerClassName="max-w-6xl"
    >
      {/* Dynamic Background Accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 end-0 w-[500px] h-[500px] bg-emerald-600/10 hidden rounded-full" />
        <div className="absolute bottom-0 start-0 w-[500px] h-[500px] bg-blue-600/10 hidden rounded-full" />
      </div>

      <div className="relative z-10 py-12 lg:py-20">
        {/* --- Header Section --- */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-950/50 border border-emerald-500/40  rounded-full mb-8"
          >
            <ShieldCheck size={16} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-50">
              The Mission Behind Athar
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-semibold text-white mb-8 leading-tight"
          >
            Intelligence meets
            <span className="text-emerald-400"> Integrity.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-300 font-medium leading-relaxed drop-shadow-sm"
          >
            We’ve engineered a secure, AI-assisted ecosystem that transforms the
            complexity of lost and found into a seamless, verifiable recovery
            process for Egypt's busiest hubs.
          </motion.p>
        </div>

        {/* --- Mission & Vision (High Contrast Cards) --- */}
        <div className="grid md:grid-cols-2 gap-8 mb-24">
          <SectionCard
            icon={<Target size={32} className="text-emerald-400" />}
            title="Our Mission"
            text="To empower frontline teams with structured data and AI matching, ensuring every lost item is reunited with its owner through rigorous, evidence-based verification."
            gradient="from-emerald-500/20 to-transparent"
          />
          <SectionCard
            icon={<Award size={32} className="text-blue-400" />}
            title="Our Vision"
            text="To set the national standard for asset recovery, where technology manages the search and humans provide the trust, making lost items a thing of the past."
            gradient="from-blue-500/20 to-transparent"
          />
        </div>

        {/* --- Core Values (Clean Grid) --- */}
        <div className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Core Principles
            </h2>
            <div className="h-1.5 w-20 bg-emerald-500 mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ValueCard
              icon={<Cpu size={28} />}
              title="AI-Driven Logic"
              desc="Our 70/30 scoring algorithm weighs visual details against location data for precision matching."
            />
            <ValueCard
              icon={<ShieldCheck size={28} />}
              title="Audit-Ready"
              desc="Every handover is logged with dual-layer proof (public vs hidden), creating a foolproof paper trail."
            />
            <ValueCard
              icon={<BellRing size={28} />}
              title="Instant Response"
              desc="Real-time alerts bridge the gap between reporting a loss and confirming a find instantly."
            />
          </div>
        </div>

        {/* --- Call to Action / How it Works --- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-10 md:p-16 text-white overflow-hidden shadow-2xl shadow-emerald-900/20"
        >
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-semibold mb-6">
              Built for Scale
            </h2>
            <p className="text-emerald-50 text-lg md:text-xl mb-12 max-w-2xl font-medium">
              Whether it's an international airport or a local university,
              Athar adapts to high-volume environments with role-based
              precision.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatItem value="70%" label="Detail Match" />
              <div className="hidden md:flex items-center justify-center text-emerald-300">
                <ArrowRight size={32} />
              </div>
              <StatItem value="30%" label="Location Factor" />
              <StatItem value="100%" label="Verification" />
            </div>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
};

// Reusable Sub-components for better visibility and maintenance
const SectionCard = ({ icon, title, text, gradient }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className={`relative p-10 rounded-3xl bg-slate-900/60 border border-slate-800  overflow-hidden group`}
  >
    <div
      className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
    />
    <div className="relative z-10">
      <div className="mb-6">{icon}</div>
      <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
      <p className="text-slate-300 leading-relaxed text-lg">{text}</p>
    </div>
  </motion.div>
);

const ValueCard = ({ icon, title, desc }) => (
  <div className="text-start p-8 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 group">
    <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
      {title}
    </h3>
    <p className="text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

const StatItem = ({ value, label }) => (
  <div className="text-center md:text-start">
    <div className="text-4xl md:text-5xl font-semibold mb-2 text-white">
      {value}
    </div>
    <p className="text-emerald-100 font-bold text-xs">
      {label}
    </p>
  </div>
);

export default AboutPage;
