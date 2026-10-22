import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  AlertCircle,
  Package,
  FileText,
  Edit2,
  Trash2,
  Eye,
  Loader,
  CheckCircle2,
  Plus,
  AlertTriangle,
  ChevronRight,
  Activity,
  History,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/auth.context";
import ClaimDetailsModal from "../components/ClaimDetailsModal";
import LostReportDetailsModal from "../components/LostReportDetailsModal";
import { PageShell } from "../components/layout";
import { AccessCard, EmptyState, LoadingState } from "../components/ui";

const MyDashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState("reports");
  const [lostReports, setLostReports] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "claims") setActiveTab("claims");
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== "USER" || !user?.id) {
      setLostReports([]);
      setFoundItems([]);
      setClaims([]);
      setIsLoading(false);
      return;
    }

    let active = true;
    setLostReports([]);
    setFoundItems([]);
    setClaims([]);
    setIsLoading(true);
    const requestOptions = { headers: { "Cache-Control": "no-cache" }, params: { _refresh: Date.now() } };
    Promise.allSettled([
      api.get("/user/lost-reports", requestOptions),
      api.get("/user/found-items", requestOptions),
      api.get("/user/claims", requestOptions),
    ])
      .then((results) => {
        if (!active) return;
        const [reportsResult, foundItemsResult, claimsResult] = results;
        if (reportsResult.status === "fulfilled") {
          setLostReports(reportsResult.value.data.lostReports || []);
        } else {
          console.error("Could not load lost reports:", reportsResult.reason);
        }
        if (foundItemsResult.status === "fulfilled") {
          setFoundItems(foundItemsResult.value.data.foundItems || []);
        } else {
          console.error("Could not load found items:", foundItemsResult.reason);
        }
        if (claimsResult.status === "fulfilled") {
          setClaims(claimsResult.value.data.claims || []);
        } else {
          console.error("Could not load claims:", claimsResult.reason);
        }
        if (results.some((result) => result.status === "rejected")) {
          toast.error("Some dashboard data could not be loaded. Other sections are still available.", { theme: "dark" });
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [authLoading, isAuthenticated, user?.id, user?.role]);

  const executeDelete = async () => {
    if (!itemToDelete) return;
    const recordType = itemToDelete.recordType;
    setIsDeleting(itemToDelete.id);

    try {
      const endpoint = recordType === "found"
        ? `/user/found-items/${itemToDelete.id}`
        : recordType === "report"
          ? `/user/lost-reports/${itemToDelete.id}`
          : `/user/claims/${itemToDelete.id}`;

      await api.delete(endpoint);

      if (recordType === "report") {
        setLostReports((prev) => prev.filter((r) => r.id !== itemToDelete.id));
      } else if (recordType === "found") {
        setFoundItems((prev) => prev.filter((item) => item.id !== itemToDelete.id));
      } else {
        setClaims((prev) => prev.filter((c) => c.id !== itemToDelete.id));
      }

      toast.success(recordType === "found" ? "Found item deleted" : "Record deleted", { theme: "dark" });
      setShowDeleteModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete this record", { theme: "dark" });
    } finally {
      setIsDeleting(null);
      setItemToDelete(null);
    }
  };

  if (!isAuthenticated || user?.role !== "USER") {
    return (
        <AccessCard
          icon={ShieldCheck}
          title="Identity Verification Required"
          description="Access to personal dossiers is restricted. Please authenticate as a USER."
        />
    );
  }

  return (
    <PageShell>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold mb-8 pt-15">
        <button
          onClick={() => navigate("/")}
          className="hover:text-emerald-400 transition-colors"
        >
          Portal
        </button>
        <ChevronRight size={12} />
        <span className="text-slate-300">Personal Dashboard</span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-semibold text-white mb-4 tracking-tight">
            User <span className="text-emerald-400">Dashboard.</span>
          </h1>
          <p className="text-slate-400 font-medium max-w-xl leading-relaxed">
            Track your lost reports and claims, and manage the found items you posted.
          </p>
        </div>

        <button
          onClick={() => navigate("/report-lost-item")}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-emerald-500 text-slate-950 font-semibold text-[11px] rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10"
        >
          <Plus size={18} />
          Report Lost Item
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-900/70 border border-slate-800 rounded-2xl w-fit mb-10">
        <TabButton
          active={activeTab === "reports"}
          onClick={() => setActiveTab("reports")}
          icon={<History size={16} />}
          label="Lost Reports"
          count={lostReports.length}
        />
        <TabButton
          active={activeTab === "found"}
          onClick={() => setActiveTab("found")}
          icon={<Package size={16} />}
          label="My Found Items"
          count={foundItems.length}
        />
        <TabButton
          active={activeTab === "claims"}
          onClick={() => setActiveTab("claims")}
          icon={<ShieldCheck size={16} />}
          label="My Claims"
          count={claims.length}
        />
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center">
          <Loader className="animate-spin text-emerald-500 mb-4" size={40} />
          <p className="text-[11px] font-semibold text-slate-500">
            Syncing Intelligence...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {activeTab === "reports" ? (
            lostReports.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No Active Reports"
                description="Your report history is currently empty. Assets reported lost will appear here."
              />
            ) : (
              lostReports.map((report) => (
                <DashboardCard
                  key={report.id}
                  title={report.item_type}
                  status={report.status}
                  stats={[
                    { label: "Site", value: report.location_lost },
                    {
                      label: "Loss Date",
                      value: new Date(report.date_lost).toLocaleDateString(
                        "en-US",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      ),
                    },
                    {
                      label: "ID Ref",
                      value: report.report_number || `ATH-${report.id.slice(0, 8).toUpperCase()}`,
                      mono: true,
                    },
                  ]}
                  actions={[
                    {
                      icon: <Eye size={18} />,
                      onClick: () => {
                        setSelectedReportId(report.id);
                        setIsReportModalOpen(true);
                      },
                      color: "emerald",
                    },
                    {
                      icon: <Edit2 size={18} />,
                      onClick: () =>
                        navigate(`/update-lost-report/${report.id}`),
                      color: "blue",
                    },
                    {
                      icon: <Trash2 size={18} />,
                      onClick: () => {
                        setItemToDelete({ ...report, recordType: "report" });
                        setShowDeleteModal(true);
                      },
                      color: "red",
                      danger: true,
                    },
                  ]}
                />
              ))
            )
          ) : activeTab === "found" ? (
            foundItems.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No Found Items Yet"
                description="Found items you post will appear here. You can remove an item while it has no active claim or handover."
              />
            ) : (
              foundItems.map((item) => (
                <DashboardCard
                  key={item.id}
                  title={item.item_type}
                  status={item.status}
                  thumbnail={item.image_urls?.[0]}
                  stats={[
                    { label: "Found at", value: item.location_found },
                    {
                      label: "Found on",
                      value: new Date(item.date_found).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }),
                    },
                    { label: "Post ID", value: `#${item.id.slice(0, 8).toUpperCase()}`, mono: true },
                  ]}
                  actions={[
                    {
                      icon: <Eye size={18} />,
                      label: "View post",
                      onClick: () => navigate(`/found-items?item=${item.id}`),
                      color: "emerald",
                    },
                    {
                      icon: <Trash2 size={18} />,
                      label: "Delete item",
                      onClick: () => {
                        setItemToDelete({ ...item, recordType: "found" });
                        setShowDeleteModal(true);
                      },
                      color: "red",
                      danger: true,
                    },
                  ]}
                />
              ))
            )
          ) : activeTab === "claims" && claims.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No Active Claims"
              description="Verification claims for found items will be listed here for status tracking."
            />
          ) : activeTab === "claims" ? (
            claims.map((claim) => (
              <DashboardCard
                key={claim.id}
                title={claim.item_name}
                status={claim.status}
                thumbnail={claim.thumbnail}
                stats={[
                  {
                    label: "Match Score",
                    value: claim.verification_status === "PENDING" ? "Calculating…" : claim.verification_status === "FAILED" ? "Unavailable" : `${claim.match_score}%`,
                    highlight: true,
                  },
                  {
                    label: "Submitted",
                    value: new Date(claim.date_submitted).toLocaleDateString(),
                  },
                  {
                    label: "Claim ID",
                    value: `#${claim.id.slice(0, 8)}`,
                    mono: true,
                  },
                ]}
                actions={[
                  {
                    icon: <Eye size={18} />,
                    onClick: () => {
                      setSelectedClaimId(claim.id);
                      setIsClaimModalOpen(true);
                    },
                    color: "emerald",
                  },
                    ...(claim.conversation_id
                      ? [{
                          icon: <MessageCircle size={18} />,
                          label: "Open chat",
                          onClick: () => navigate(`/chats/${claim.conversation_id}`),
                          color: "emerald",
                        }]
                      : []),
                  {
                    icon: <Trash2 size={18} />,
                    onClick: () => {
                      setItemToDelete({ ...claim, recordType: "claim" });
                      setShowDeleteModal(true);
                    },
                    color: "red",
                    danger: true,
                  },
                ]}
              />
            ))
          ) : null}
        </div>
      )}

      {/* Modals */}
      <ClaimDetailsModal
        claimId={selectedClaimId}
        isOpen={isClaimModalOpen}
        onClose={() => {
          setIsClaimModalOpen(false);
          setSelectedClaimId(null);
        }}
      />
      <LostReportDetailsModal
        reportId={selectedReportId}
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setSelectedReportId(null);
        }}
      />

      {/* Universal Delete Confirmation */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[110] p-4">
          <div className="bg-slate-900/70 rounded-3xl border border-slate-800 shadow-2xl max-w-md w-full p-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle size={32} className="text-rose-500" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3 tracking-tight">
                {itemToDelete.recordType === "found" ? "Delete Found Item?" : "Delete Record?"}
              </h3>
              <p className="text-slate-400 mb-8 text-sm font-medium leading-relaxed px-4">
                {itemToDelete.recordType === "found"
                  ? "This permanently removes your found-item post. Items with an active claim or handover cannot be deleted. "
                  : "This action will permanently delete the record for "}{" "}
                <span className="text-white font-bold">
                  {itemToDelete.item_type || itemToDelete.item_name}
                </span>
                . This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-5 py-4 bg-slate-900 text-slate-400 text-[11px] font-semibold rounded-2xl hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={!!isDeleting}
                className="flex-1 px-5 py-4 bg-rose-600 text-white text-[11px] font-semibold rounded-2xl hover:bg-rose-500 transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  itemToDelete.recordType === "found" ? "Delete item" : "Confirm delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};

// --- Sub-Components ---

const TabButton = ({ active, onClick, icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all ${
      active
        ? "bg-emerald-500 text-slate-950 shadow-lg"
        : "text-slate-500 hover:text-slate-300"
    }`}
  >
    {icon}
    <span className="text-[11px] font-semibold">
      {label}
    </span>
    <span
      className={`px-2 py-0.5 rounded-md text-[9px] font-semibold ${
        active ? "bg-slate-950/10" : "bg-slate-800 text-slate-400"
      }`}
    >
      {count}
    </span>
  </button>
);

const DashboardCard = ({ title, status, stats, actions, thumbnail }) => (
  <div className="group bg-slate-900/70 border border-slate-800 rounded-3xl p-6 hover:border-emerald-500/30 transition-all shadow-xl">
    <div className="flex flex-col md:flex-row md:items-center gap-6">
      {thumbnail && (
        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-800">
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex-1">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-semibold text-white tracking-tight">
            {title}
          </h3>
          <StatusBadge status={status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div key={i}>
              <p className="text-[9px] font-semibold text-slate-600 mb-1">
                {stat.label}
              </p>
              <p
                className={`text-xs font-bold ${
                  stat.highlight ? "text-emerald-400" : "text-slate-300"
                } ${stat.mono ? "font-mono" : ""}`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex md:flex-col gap-2 border-t md:border-t-0 md:border-s border-slate-800 pt-6 md:pt-0 md:ps-6">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            title={action.label || action.title}
            aria-label={action.label || action.title}
            className={`${action.label ? "flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold" : "p-3"} rounded-xl border border-slate-800 bg-slate-950/50 transition-all ${
              action.danger
                ? "hover:bg-rose-500/10 hover:border-rose-500/50 text-slate-500 hover:text-rose-500"
                : "hover:bg-emerald-500/10 hover:border-emerald-500/50 text-slate-500 hover:text-emerald-400"
            }`}
          >
            {action.icon}
            {action.label && <span>{action.label}</span>}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const configs = {
    OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    MATCHED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    RESOLVED: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    REJECTED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    COLLECTED: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    FOUND: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    CLAIMED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    RETURNED: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  };
  return (
    <span
      className={`px-2.5 py-1 text-[9px] font-semibold   rounded-md border ${
        configs[status] || "bg-slate-800 text-slate-400"
      }`}
    >
      {status}
    </span>
  );
};

export default MyDashboardPage;
