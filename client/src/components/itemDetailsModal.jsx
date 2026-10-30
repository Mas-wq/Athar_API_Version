import React, { useEffect, useState } from "react";
import {
  X,
  Package,
  MapPin,
  Calendar,
  Eye,
  EyeOff,
  Loader,
  AlertCircle,
  CheckCircle2,
  Shield,
  ExternalLink,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/auth.context";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";

const ItemDetailsModal = ({ itemId, isOpen, onClose }) => {
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPrivileged = user?.role === "ADMIN";
  const isAuthenticated = !!user;
  const displayValue = (value) => {
    if (value == null) return "";
    return typeof value === "string" || typeof value === "number"
      ? value
      : JSON.stringify(value);
  };

  useEffect(() => {
    if (isOpen && itemId) {
      fetchItemDetails();
    }
  }, [itemId, isOpen]);

  const fetchItemDetails = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/items/found-items/${itemId}`);
      setItem(response.data.data);
    } catch (error) {
      console.error("Failed to fetch item details:", error);
      toast.error("Security alert: Could not retrieve item data", {
        theme: "dark",
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="pt-15 fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/80 "
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-5xl max-h-[80vh] bg-slate-900/70 border border-slate-800 rounded-3xl shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)] overflow-hidden flex flex-col"
      >
        {/* Header: Fixed */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800 bg-slate-900/70/50 ">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Package size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Technical Specifications
              </h2>
              <p className="text-xs font-bold text-slate-500">
                Reference ID: {itemId?.slice(-8)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto custom-scrollbar flex-grow p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader className="animate-spin text-emerald-500" size={40} />
              <p className="text-slate-400 font-bold text-sm">
                Querying Secure Database...
              </p>
            </div>
          ) : item ? (
            <div className="space-y-10">
              {item.status === "RETURNED" && (
                <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 px-5 py-4 text-center font-bold text-teal-300">
                  Delivered to owner
                </div>
              )}
              {item.status === "CLAIMED" && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-center font-bold text-amber-200">
                  Claim approved — collection pending
                </div>
              )}
              {item.status === "ARCHIVED" && (
                <div className="rounded-2xl border border-slate-500/30 bg-slate-500/10 px-5 py-4 text-center font-bold text-slate-200">This item is archived and unavailable for claims</div>
              )}
              {/* Primary Info Block */}
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800">
                    <span className="text-[11px] font-semibold text-emerald-500 mb-2 block">
                      Found Category
                    </span>
                    <h3 className="text-4xl font-semibold text-white mb-6">
                      {item.item_type}
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <DetailBox
                        icon={<MapPin size={14} />}
                        label="Location"
                        value={item.location_found}
                      />
                      <DetailBox
                        icon={<Calendar size={14} />}
                        label="Found Date"
                        value={formatDate(item.date_found)}
                      />
                    </div>
                  </div>

                  {/* Public Attributes */}
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-xs font-semibold text-white px-2">
                      <Eye size={14} className="text-emerald-400" /> Public
                      Description
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {Object.entries(item.public_details || {}).map(
                        ([key, val]) => (
                          <div
                            key={key}
                            className="flex justify-between items-center p-4 bg-slate-900/30 border border-slate-800 rounded-2xl"
                          >
                            <span className="text-xs font-bold text-slate-500">
                              {key}
                            </span>
                            <span className="text-sm font-bold text-slate-200">
                              {displayValue(val)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Evidence Gallery */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-white px-2">
                    Evidence Photos
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {(Array.isArray(item.image_urls) ? item.image_urls : []).map((url, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-2xl overflow-hidden border border-slate-800 group relative"
                      >
                        <img
                          src={url}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Private verification details are not shown on public item pages. */}
              {isPrivileged && (
                <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/20 relative overflow-hidden">
                  <div className="absolute top-0 end-0 p-4 opacity-10">
                    <Shield size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <EyeOff size={20} />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-amber-500">
                          Privileged Verification Data
                        </h4>
                        <p className="text-xs font-bold text-amber-500/60">
                          Internal use only — Do not disclose
                        </p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {Object.entries(item.hidden_details || {}).map(
                        ([key, val]) => (
                          <div
                            key={key}
                            className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl"
                          >
                            <p className="text-[11px] font-semibold text-amber-500/70 mb-1">
                              {key}
                            </p>
                            <p className="text-sm font-bold text-amber-50">
                              {displayValue(val)}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer: Action Bar */}
        <div className="px-8 py-6 border-t border-slate-800 bg-slate-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500">
            <Shield size={14} />
            <span className="text-[11px] font-bold tracking-tighter">
              Verified claim process active
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Close
            </button>
            {!isPrivileged && item?.status === "FOUND" && (
              <button
                onClick={() =>
                  navigate(isAuthenticated ? `/claim/${itemId}` : "/login")
                }
                className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <ExternalLink size={14} /> Start Recovery
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const DetailBox = ({ icon, label, value }) => (
  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl">
    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 mb-1">
      {icon} {label}
    </div>
    <div className="text-sm font-bold text-white truncate">{value}</div>
  </div>
);

export default ItemDetailsModal;

