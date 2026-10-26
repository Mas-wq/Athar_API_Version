import React from "react";
import { Package, MapPin, Calendar, ArrowRight, Sparkles, CircleCheck, Gavel } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router";

const ItemCard = ({ item, onClick }) => {
  const imageUrl = item.image_urls?.[0] || null;

  const itemStatus = item.status?.toUpperCase();
  const statusLabel =
    itemStatus === "RETURNED" ? "Returned to owner"
      : itemStatus === "SOLD" ? "Sold · collected"
        : itemStatus === "CLAIMED" ? "Claim approved · collection pending"
          : itemStatus === "IN_AUCTION" ? "In auction"
            : itemStatus === "UNCLAIMED" ? "Unclaimed"
              : "Available to claim";
  const statusStyles =
    ["RETURNED", "SOLD"].includes(itemStatus)
      ? "bg-teal-500/15 text-teal-200 border-teal-400/30"
      : itemStatus === "CLAIMED"
        ? "bg-amber-500/15 text-amber-200 border-amber-400/30"
        : itemStatus === "IN_AUCTION"
          ? "bg-cyan-500/15 text-cyan-200 border-cyan-400/30"
          : itemStatus === "UNCLAIMED"
            ? "bg-slate-500/15 text-slate-200 border-slate-400/30"
            : "bg-emerald-500/15 text-emerald-200 border-emerald-400/30";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${item.item_type || "Item"}, view details`}
      className="group relative flex flex-col h-full surface rounded-2xl hover:border-white/20 transition-colors duration-300 cursor-pointer overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
        {imageUrl ? (
          <motion.img
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            src={imageUrl}
            alt={item.item_type}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 gap-2.5">
            <Package
              size={36}
              className="text-slate-600 group-hover:text-emerald-300/60 transition-colors"
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-slate-500">No preview</span>
          </div>
        )}

        {/* Completion status: shown only after both parties finish handover */}
        {["RETURNED", "SOLD"].includes(itemStatus) ? (
          <div className="absolute inset-x-0 top-0 z-20 flex justify-center p-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200/60 bg-teal-300 px-3.5 py-1.5 text-xs font-semibold text-slate-950 shadow-lg shadow-teal-950/40">
              <CircleCheck size={15} strokeWidth={2.5} /> {itemStatus === "SOLD" ? "Sold · collected" : "Returned to owner"}
            </span>
          </div>
        ) : itemStatus === "IN_AUCTION" ? (
          <div className="absolute inset-x-0 top-0 z-20 flex justify-center p-3">
            <Link
              to={item.auction_id ? `/auctions/${item.auction_id}` : "/auctions"}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-200/60 bg-cyan-300 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-lg"
            >
              <Gavel size={14} /> In auction · {item.auction_current_price || "View bids"} {item.auction_current_price ? "EGP" : ""}
            </Link>
          </div>
        ) : (
          <div className="absolute top-3 start-3 z-20">
            <span
              className={`inline-flex px-2.5 py-1 text-[11px] font-medium rounded-full border  ${statusStyles}`}
            >
              {statusLabel}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col flex-grow p-5">
        <h3
          dir="auto"
          className="text-lg font-semibold text-white mb-4 line-clamp-1 group-hover:text-emerald-200 transition-colors"
        >
          {item.item_type || "Uncategorized Item"}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <MapPin size={12} className="text-emerald-300" aria-hidden="true" /> Location
            </div>
            <p dir="auto" className="text-sm text-slate-200 font-medium truncate">
              {item.location_found || "Unknown"}
            </p>
          </div>

          <div className="space-y-1 border-s border-white/[0.07] ps-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Calendar size={12} className="text-emerald-300" aria-hidden="true" /> Found on
            </div>
            <p className="text-sm text-slate-200 font-medium">
              {item.date_found
                ? new Date(item.date_found).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "N/A"}
            </p>
          </div>
        </div>

        <div className="mt-auto">
          <div className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.04] border border-white/10 group-hover:bg-white/[0.07] group-hover:border-white/20 text-white rounded-xl transition-colors duration-300">
            <span className="text-sm font-medium flex items-center gap-2">
              <Sparkles size={15} className="text-emerald-300" aria-hidden="true" />
              View Details
            </span>
            <ArrowRight
              size={16}
              className="group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-transform text-emerald-300"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default ItemCard;
