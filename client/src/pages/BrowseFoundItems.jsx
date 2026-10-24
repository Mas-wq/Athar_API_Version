import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { Search, Filter, Package, X, LayoutGrid, Info } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import ItemCard from "../components/ItemCard";
import ItemDetailsModal from "../components/itemDetailsModal";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "../components/layout";
import { Card, EmptyState, LoadingState, PageHeader } from "../components/ui";

const BrowseFoundItems = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    const itemId = searchParams.get("item");
    if (itemId) {
      setSelectedItemId(itemId);
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/items/found-items");
      setItems(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch items:", error);
      toast.error("Network error: Could not load inventory", {
        position: "bottom-right",
        theme: "dark",
      });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return items.filter((item) => {
      const matchesType = item.item_type?.toLowerCase().includes(term);
      const matchesDescription = item.public_details?.description?.toLowerCase().includes(term);
      const matchesLocation = item.location_found?.toLowerCase().includes(term);
      return matchesType || matchesDescription || matchesLocation;
    });
  }, [items, searchTerm]);

  const stats = useMemo(() => {
    const available = items.filter(i => ["found", "available"].includes(i.status?.toLowerCase()) || !i.status).length;
    const claimed = items.filter(i => i.status?.toLowerCase() === "claimed").length;
    return { total: items.length, available, claimed };
  }, [items]);

  return (
    <PageShell className="bg-transparent" containerClassName="max-w-6xl">
      <div className="relative z-10 py-15">

        {/* --- Header Section --- */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-4"
            >
              <LayoutGrid size={14} /> Global Inventory
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4">
              Found <span className="text-emerald-400">Items.</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl font-medium">
              Filter through our verified database to locate your belongings.
              Click on an item to view public details and initiate a recovery claim.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex gap-4"
          >
            <StatPill label="Inventory" value={stats.total} color="slate" />
            <StatPill label="Available" value={stats.available} color="emerald" />
            <StatPill label="Claimed" value={stats.claimed} color="teal" hideOnMobile />
          </motion.div>
        </div>

        {/* --- Search & Filter Bar --- */}
        <div className="mb-10 group">
          <div className="relative">
            <Search className="absolute start-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={22} />
            <input
              type="text"
              placeholder="Search by category, color, or location (e.g., 'iPhone' or 'Tahrir Square')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full ps-14 pe-14 py-5 bg-slate-950 border border-slate-800 rounded-2xl text-white font-medium placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-2xl"
            />
            <AnimatePresence>
              {searchTerm && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearchTerm("")}
                  className="absolute end-5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-4 flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter size={14} />
              <span>Matching: <b className="text-slate-300">{filteredItems.length}</b> items</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-900/50 px-3 py-1 rounded-full">
              <Info size={12} />
              <span>Public information only. Verification required for pickup.</span>
            </div>
          </div>
        </div>

        {/* --- Content States --- */}
        {isLoading ? (
          <div className="py-20">
            <LoadingState label="Decrypting inventory records..." />
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20">
            <EmptyState
              icon={Package}
              title="No Results Found"
              description={searchTerm ? `We couldn't find anything matching "${searchTerm}".` : "The inventory is currently empty."}
            />
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id || item._id}
                item={item}
                onClick={() => {
                  setSelectedItemId(item.id || item._id);
                  setIsModalOpen(true);
                }}
              />
            ))}
          </motion.div>
        )}

        <ItemDetailsModal
          itemId={selectedItemId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItemId(null);
          }}
        />
      </div>
    </PageShell>
  );
};

// --- Sub-components for better visibility ---

const StatPill = ({ label, value, color, hideOnMobile }) => {
  const colors = {
    slate: "border-slate-800 text-white",
    emerald: "border-emerald-500/30 text-emerald-400",
    teal: "border-teal-500/30 text-teal-400"
  };

  return (
    <div className={`${hideOnMobile ? 'hidden sm:flex' : 'flex'} flex-col justify-center min-w-[100px] md:min-w-[140px] px-6 py-4 bg-slate-900/40  border ${colors[color]} rounded-2xl`}>
      <span className="text-[11px] font-semibold opacity-60 mb-1">{label}</span>
      <span className="text-2xl md:text-3xl font-semibold tabular-nums leading-none">{value}</span>
    </div>
  );
};

export default BrowseFoundItems;
