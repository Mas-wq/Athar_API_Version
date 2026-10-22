import React, { useEffect, useState } from "react";
import {
  X,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Loader2,
  Calendar,
  ShieldCheck,
  ImageIcon,
  ClipboardCheck,
  Zap,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/auth.context";

const ClaimDetailsModal = ({ claimId, isOpen, onClose }) => {
  const { isAuthenticated, user } = useAuth();
  const [claim, setClaim] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && claimId && isAuthenticated && user?.role === "USER") {
      fetchClaim();
    }
  }, [isOpen, claimId, isAuthenticated, user]);

  const fetchClaim = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/user/claims/${claimId}`);
      setClaim(res.data.claim);
    } catch (error) {
      toast.error("Telemetry sync failed", { theme: "dark" });
      onClose?.();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !isAuthenticated || user?.role !== "USER") return null;

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center pt-15">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl max-h-[80vh] bg-slate-900/70 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-semibold text-white tracking-tight">
                Claim <span className="text-emerald-400">Verification.</span>
              </h2>
              {claim && <StatusBadge status={claim.status} />}
            </div>
            <p className="text-[11px] font-semibold text-slate-500">
              Claim ID:{" "}
              <span className="text-slate-300 font-mono">
                #{claimId?.slice(0, 12)}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
              <p className="text-[11px] font-semibold text-slate-500">
                Reconstructing Claim Data...
              </p>
            </div>
          ) : claim ? (
            <div className="space-y-8">
              {/* Top Intelligence Bar */}
              <div className="flex flex-wrap gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-5 py-3 rounded-2xl flex items-center gap-3">
                  <Zap
                    size={18}
                    className="text-emerald-400 fill-emerald-400/20"
                  />
                  <div>
                    <p className="text-[9px] font-semibold text-emerald-500 leading-none mb-1">
                      Ownership answer score
                    </p>
                    <p className="text-lg font-semibold text-emerald-400">
                      {claim.claim_details?.ai_review?.status === "PENDING" ? "Calculating…" : claim.claim_details?.ai_review?.status === "FAILED" ? "Unavailable" : `${claim.match_percentage}%`}
                    </p>
                    <p className="mt-1 max-w-52 text-[11px] leading-relaxed text-slate-400">
                      Athar AI prepared questions from the item photo. The backend scored the answers; the finder reviews them and makes the final decision.
                    </p>
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 px-5 py-3 rounded-2xl flex items-center gap-3">
                  <ShieldCheck size={18} className="text-slate-500" />
                  <div>
                    <p className="text-[9px] font-semibold text-slate-500 leading-none mb-1">
                      Submission Date
                    </p>
                    <p className="text-lg font-semibold text-slate-300">
                      {new Date(claim.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Your Evidence */}
                <div className="space-y-6">
                  <SectionHeader
                    icon={ClipboardCheck}
                    title="Your Claim Evidence"
                  />
                  <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-6">
                    {Array.isArray(claim.claim_details?.ownership_questions) && claim.claim_details.ownership_questions.length > 0 ? (
                      <div>
                        <p className="text-[9px] font-semibold text-slate-600 mb-3">AI Ownership Questions</p>
                        <div className="space-y-3">
                          {claim.claim_details.ownership_questions.map((entry, index) => (
                            <div key={entry.id || index} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                              <p className="text-sm font-semibold text-slate-200">{index + 1}. {entry.question}</p>
                              <p className="mt-2 text-sm text-emerald-300">Your answer: {entry.answer}</p>
                              {Number.isFinite(Number(entry.answer_score)) && <p className="mt-1 text-xs text-slate-500">Answer score: {entry.answer_score}%</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[9px] font-semibold text-slate-600 mb-3">Proof Details Provided</p>
                        <div className="space-y-4">{renderMetadata(claim.claim_details?.user_proof)}</div>
                      </div>
                    )}
                    {Array.isArray(claim.image_urls) && claim.image_urls.length > 0 && (
                      <div>
                        <p className="text-[9px] font-semibold text-slate-600 mb-3">
                          Ownership Documentation
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {claim.image_urls.map((url, i) => (
                            <div
                              key={i}
                              className="aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-slate-950"
                            >
                              <img
                                src={url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Asset Intelligence */}
                <div className="space-y-6">
                  <SectionHeader
                    icon={ImageIcon}
                    title="Found Asset Reference"
                  />
                  <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-800">
                      <div className="space-y-1">
                        <p className="text-[9px] font-semibold text-slate-600">
                          Asset Type
                        </p>
                        <p className="text-sm font-bold text-white">
                          {displayValue(claim.item_info?.type)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-semibold text-slate-600">
                          Recovery Site
                        </p>
                        <p className="text-sm font-bold text-white">
                          {displayValue(claim.item_info?.location)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-semibold text-slate-600 mb-3">
                        Public Descriptive Data
                      </p>
                      <div className="space-y-4">
                        {renderMetadata(claim.item_info?.public_details)}
                      </div>
                    </div>

                    {Array.isArray(claim.item_info?.images) && claim.item_info.images.length > 0 && (
                      <div>
                        <p className="text-[9px] font-semibold text-slate-600 mb-3">
                          Asset Visuals
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {claim.item_info.images.map((url, i) => (
                            <div
                              key={i}
                              className="aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-slate-950"
                            >
                              <img
                                src={url}
                                alt=""
                                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center">
              <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
              <p className="text-white font-semibold text-xs">
                Claim Analysis Failed
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-800 text-slate-300 text-[11px] font-semibold rounded-xl hover:bg-slate-700 transition-all"
          >
            Exit Verification
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Helpers ---

const StatusBadge = ({ status }) => {
  const configs = {
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    REJECTED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    COLLECTED: "bg-teal-500/10 text-teal-400 border-teal-500/20",
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

const renderMetadata = (data) => {
  if (!data)
    return (
      <p className="text-xs text-slate-600 font-bold italic">
        No data points available
      </p>
    );
  if (typeof data === "string")
    return (
      <p className="text-sm font-bold text-slate-300 leading-relaxed">{data}</p>
    );

  if (Array.isArray(data)) {
    return (
      <p className="text-sm font-bold text-slate-300 leading-relaxed">
        {displayValue(data)}
      </p>
    );
  }

  return Object.entries(data).map(([key, value]) => (
    <div key={key} className="flex flex-col">
      <span className="text-[9px] font-semibold text-slate-600 mb-1">
        {key}
      </span>
      <span className="text-sm font-bold text-slate-300">{displayValue(value)}</span>
    </div>
  ));
};

const displayValue = (value) => {
  if (value == null || value === "") return "N/A";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(displayValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, nestedValue]) => `${key}: ${displayValue(nestedValue)}`)
      .join(" · ");
  }
  return String(value);
};

export default ClaimDetailsModal;
