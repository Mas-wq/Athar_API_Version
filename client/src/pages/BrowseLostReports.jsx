import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Package, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
import { PageShell } from "../components/layout";
import { EmptyState, LoadingState } from "../components/ui";

const BrowseLostReports = () => {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/items/lost-reports")
      .then(({ data }) => setReports(data.data || []))
      .catch(() => setError("Could not load lost item reports. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reports;
    return reports.filter((report) => {
      const details = Object.values(report.report_details || {}).join(" ");
      return [report.item_type, report.location_lost, details]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [reports, search]);

  return (
    <PageShell className="bg-transparent" containerClassName="max-w-6xl">
      <div className="relative z-10 py-15">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-xs font-bold text-amber-400">Community Reports</p>
          <h1 className="mb-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Lost <span className="text-amber-400">Items.</span>
          </h1>
          <p className="text-lg text-slate-400">
            Every community report stays visible with its current status. Athar AI alerts the report owner when a found item may match.
          </p>
        </div>

        <div className="group relative mb-8">
          <Search className="absolute start-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by item, details, or location..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-4 ps-14 pe-14 font-medium text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
          />
          <AnimatePresence>
            {search && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSearch("")} className="absolute end-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white" aria-label="Clear search">
                <X size={18} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {loading ? (
          <div className="py-20"><LoadingState label="Loading community reports..." /></div>
        ) : error ? (
          <p role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-300">{error}</p>
        ) : filteredReports.length === 0 ? (
          <div className="py-16">
            <EmptyState icon={Package} title="No Lost Reports Found" description={search ? "Try a different search." : "There are no open lost item reports yet."} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredReports.map((report) => {
              const details = Object.entries(report.report_details || {}).filter(([, value]) => value);
              return (
                <motion.article key={report.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
                  {report.image_urls?.[0] ? (
                    <img src={report.image_urls[0]} alt={report.item_type} className="h-52 w-full object-cover" />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-slate-900 text-slate-700"><Package size={42} /></div>
                  )}
                  <div className="p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div><h2 className="text-xl font-bold text-white">{report.item_type}</h2><p className="mt-1 font-mono text-[11px] text-slate-500">{report.report_number || `ATH-${report.id.slice(0, 8).toUpperCase()}`}</p></div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold   ${report.status === "RESOLVED" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : report.status === "MATCHED" ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>{report.status === "RESOLVED" ? "Returned" : report.status === "MATCHED" ? "Claim accepted" : "Lost"}</span>
                    </div>
                    <div className="space-y-3 text-sm text-slate-300">
                      <p className="flex items-center gap-2"><MapPin size={15} className="shrink-0 text-amber-400" />{report.location_lost}</p>
                      <p className="flex items-center gap-2"><CalendarDays size={15} className="shrink-0 text-amber-400" />{new Date(report.date_lost).toLocaleDateString()}</p>
                    </div>
                    {details.length > 0 && (
                      <dl className="mt-5 space-y-2 border-t border-slate-800 pt-4">
                        {details.map(([key, value]) => <div key={key} className="flex gap-2 text-sm"><dt className="font-semibold text-slate-500">{key}:</dt><dd className="text-slate-300">{String(value)}</dd></div>)}
                      </dl>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default BrowseLostReports;
