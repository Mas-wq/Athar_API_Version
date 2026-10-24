import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  MapPin,
  Loader,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/auth.context";

const ClaimDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [claim, setClaim] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "USER") {
      setIsLoading(false);
      return;
    }

    const fetchClaim = async () => {
      try {
        const res = await api.get(`/user/claims/${id}`);
        setClaim(res.data.claim);
      } catch (error) {
        console.error("Failed to load claim", error);
        toast.error(error.response?.data?.message || "Failed to load claim");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClaim();
  }, [id, isAuthenticated, user]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: {
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        label: "Pending",
      },
      APPROVED: {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        label: "Approved",
      },
      REJECTED: {
        bg: "bg-rose-500/10",
        text: "text-rose-400",
        label: "Rejected",
      },
      COLLECTED: {
        bg: "bg-teal-500/10",
        text: "text-teal-400",
        label: "Collected",
      },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 ${config.bg} ${config.text} rounded-full text-xs font-semibold border border-current/20`}
      >
        <CheckCircle2 size={12} />
        {config.label}
      </span>
    );
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  const renderDetails = (details) => {
    if (details == null || details === "") return null;
    if (typeof details !== "object" || Array.isArray(details)) {
      return <p className="text-slate-300 text-sm leading-relaxed">{displayValue(details)}</p>;
    }

    return Object.entries(details).map(([key, value]) => (
      <div key={key} className="rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2">
        <p className="text-[11px] font-semibold text-slate-500">{key}</p>
        <p className="mt-1 break-words text-sm text-slate-200">{displayValue(value)}</p>
      </div>
    ));
  };

  if (!isAuthenticated || user?.role !== "USER") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="bg-slate-900/70  border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={36} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Authentication Required
          </h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            You must be logged in to view this claim.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <Loader size={48} className="text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="bg-slate-900/70  border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Claim not found
          </h2>
          <p className="text-slate-400 mb-6">
            The claim you are looking for does not exist or was removed.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const itemInfo = claim.item_info || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="group inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors mb-6"
        >
          <ArrowLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span className="font-medium">Back</span>
        </button>

        <div className="bg-slate-900/70  border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Claim Details
                </h1>
                {getStatusBadge(claim.status)}
              </div>
              <p className="text-slate-400">
                Submitted {formatDate(claim.created_at)}
              </p>
            </div>
            {claim.match_percentage !== undefined && (
              <div className="px-4 py-2 bg-emerald-500/10 text-emerald-300 rounded-xl border border-emerald-500/20 font-semibold">
                Ownership Answer Score: {claim.claim_details?.ai_review?.status === "PENDING" ? "Calculating…" : claim.claim_details?.ai_review?.status === "FAILED" ? "Unavailable" : `${claim.match_percentage}%`}
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Item Info
                </h3>
                <div className="flex items-center gap-2 text-slate-300">
                  <ImageIcon size={16} />
                  <span>{displayValue(itemInfo.type || "Unknown item")}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 mt-2">
                  <MapPin size={16} />
                  <span>{displayValue(itemInfo.location)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 mt-2">
                  <Clock size={16} />
                  <span>
                    {itemInfo.date ? formatDate(itemInfo.date) : "N/A"}
                  </span>
                </div>
                {itemInfo.public_details && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500">Public item details</h4>
                    {renderDetails(itemInfo.public_details)}
                  </div>
                )}
              </div>

              {Array.isArray(claim.claim_details?.ownership_questions) && claim.claim_details.ownership_questions.length > 0 ? (
                <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">AI Ownership Questions</h3>
                  <div className="space-y-3">
                    {claim.claim_details.ownership_questions.map((entry, index) => (
                      <div key={entry.id || index} className="rounded-lg border border-white/5 bg-slate-900/50 px-4 py-3">
                        <p className="text-sm font-medium text-slate-200">{index + 1}. {entry.question}</p>
                        <p className={`mt-2 break-words text-sm ${Number(entry.answer_score) >= 80 ? "text-emerald-300" : "text-amber-200"}`}>
                          Claimant answer: {displayValue(entry.answer)}{Number.isFinite(Number(entry.answer_score)) ? ` · ${entry.answer_score}%` : ""}
                        </p>
                        {claim.viewer_role === "FINDER" && entry.expected_answer && (
                          <p className="mt-1 break-words text-sm font-semibold text-emerald-300">Photo reference: {entry.expected_answer}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">The score is a guide. Review the answers and evidence before deciding.</p>
                </div>
              ) : claim.claim_details?.user_proof && (
                <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Claim proof details</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {renderDetails(claim.claim_details.user_proof)}
                  </div>
                </div>
              )}

              {Array.isArray(claim.image_urls) &&
                claim.image_urls.length > 0 && (
                  <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Proof Images
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {claim.image_urls.map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt="Proof"
                          className="w-full h-28 object-cover rounded-lg border border-white/10"
                        />
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {Array.isArray(itemInfo.images) && itemInfo.images.length > 0 && (
              <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Found Item Photos
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {itemInfo.images.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="Found item"
                      className="w-full h-32 object-cover rounded-lg border border-white/10"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimDetailsPage;
