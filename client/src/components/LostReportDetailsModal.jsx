import React, { useEffect, useState } from "react";
import {
  X,
  AlertCircle,
  Package,
  MapPin,
  Calendar,
  FileText,
  CheckCircle2,
  Camera,
  Loader2,
  ShieldCheck,
  Info,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/auth.context";

const LostReportDetailsModal = ({ reportId, isOpen, onClose }) => {
  const { isAuthenticated, user } = useAuth();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && reportId && isAuthenticated && user?.role === "USER") {
      fetchReport();
    }
  }, [isOpen, reportId, isAuthenticated, user]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/user/lost-reports/${reportId}`);
      setReport(res.data.lostReport);
    } catch (error) {
      toast.error("Telemetry failed to sync", { theme: "dark" });
      onClose?.();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !isAuthenticated || user?.role !== "USER") return null;

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center pt-15">
      <div
        className="absolute inset-0 bg-slate-950/80 "
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl max-h-[80vh] bg-slate-900/70 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-10 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-semibold text-white tracking-tight">
                Report <span className="text-emerald-400">Dossier.</span>
              </h2>
              {report && <StatusBadge status={report.status} />}
            </div>
            <p className="text-[11px] font-semibold text-slate-500">
              Reference:{" "}
              <span className="text-slate-300 font-mono">
                #{reportId?.slice(0, 12)}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
              <p className="text-[11px] font-semibold text-slate-500">
                Accessing Registry...
              </p>
            </div>
          ) : report ? (
            <div className="space-y-10">
              {/* Asset Hero Card */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-6">
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-500 mb-1">
                        Target Asset Type
                      </p>
                      <h3 className="text-4xl font-semibold text-white leading-tight">
                        {report.item_type}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InfoBlock
                        icon={<MapPin size={14} />}
                        label="Loss Location"
                        value={report.location_lost}
                      />
                      <InfoBlock
                        icon={<Calendar size={14} />}
                        label="Incident Date"
                        value={new Date(report.date_lost).toLocaleDateString(
                          "en-US",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      />
                    </div>
                  </div>

                  {/* Status Helper Card */}
                  <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl p-6 min-w-[240px]">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      <span className="text-[11px] font-semibold text-emerald-500">
                        System Status
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                      {report.status === "OPEN"
                        ? "Athar AI is checking new found posts for a possible match."
                        : "This report has been successfully linked to a found asset."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Specifications */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <SectionHeader icon={FileText} title="Specifications" />
                  <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                    {report.report_details ? (
                      renderMetadata(report.report_details)
                    ) : (
                      <p className="text-xs text-slate-600 font-semibold italic">
                        No detailed specs provided
                      </p>
                    )}
                  </div>
                </div>

                {/* Evidence Photos */}
                <div className="space-y-6">
                  <SectionHeader icon={Camera} title="Evidence Documentation" />
                  {report.image_urls?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {report.image_urls.map((url, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden group"
                        >
                          <img
                            src={url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-40 rounded-3xl border border-dashed border-slate-800 flex items-center justify-center">
                      <p className="text-[11px] font-semibold text-slate-600">
                        No Photos Uploaded
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center">
              <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
              <p className="text-white font-semibold text-xs">
                Report Registry Unavailable
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-10 py-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-800 text-slate-300 text-[11px] font-semibold rounded-xl hover:bg-slate-700 transition-all"
          >
            Dismiss Dossier
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Sub-Components ---

const StatusBadge = ({ status }) => {
  const configs = {
    OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    MATCHED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    RESOLVED: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  };
  return (
    <span
      className={`px-3 py-1 text-[11px] font-semibold   rounded-lg border ${configs[status]}`}
    >
      {status}
    </span>
  );
};

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-3 px-2">
    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
      <Icon size={16} />
    </div>
    <h3 className="text-xs font-semibold text-slate-300">
      {title}
    </h3>
  </div>
);

const InfoBlock = ({ icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="text-emerald-500">{icon}</div>
    <div>
      <p className="text-[9px] font-semibold text-slate-600 leading-none mb-1">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-200">{value}</p>
    </div>
  </div>
);

const renderMetadata = (data) => {
  if (typeof data === "string")
    return (
      <p className="text-sm font-bold text-slate-300 leading-relaxed">{data}</p>
    );
  return Object.entries(data).map(([key, value]) => (
    <div key={key} className="flex flex-col mb-4 last:mb-0">
      <span className="text-[9px] font-semibold text-slate-600 mb-1">
        {key}
      </span>
      <span className="text-sm font-bold text-slate-300">{String(value)}</span>
    </div>
  ));
};

export default LostReportDetailsModal;
