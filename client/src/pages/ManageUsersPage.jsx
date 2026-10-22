import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Shield,
  Mail,
  Phone,
  Calendar,
  Loader,
  UserCheck,
  UserX,
  AlertTriangle,
  Filter,
  User,
  X,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/auth.context";
import { useNavigate } from "react-router";

const ManageUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/admin/users");
      setUsers(response.data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Access Denied: Could not fetch user ledger", {
        theme: "dark",
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    if (currentStatus) {
      const user = users.find((u) => u.id === userId);
      setSelectedUser({
        id: userId,
        name: user?.full_name || "this user",
      });
      setShowConfirmModal(true);
      return;
    }
    await performStatusToggle(userId, currentStatus);
  };

  const performStatusToggle = async (userId, currentStatus) => {
    try {
      const endpoint = currentStatus
        ? `/admin/users/${userId}/deactivate`
        : `/admin/users/${userId}/activate`;
      await api.patch(endpoint);
      toast.success(
        `Access ${!currentStatus ? "granted" : "revoked"} successfully`,
        { theme: "dark" }
      );
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed", {
        theme: "dark",
      });
    }
  };

  const handleConfirmDeactivate = async () => {
    if (selectedUser) {
      await performStatusToggle(selectedUser.id, true);
      setShowConfirmModal(false);
      setSelectedUser(null);
    }
  };

  const handleCancelDeactivate = () => {
    setShowConfirmModal(false);
    setSelectedUser(null);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const activeCount = users.filter((u) => u.is_active).length;

  // Check authentication and show restriction message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent px-4">
        <div className="bg-slate-900/40 backdrop-blur-2xl rounded-3xl p-10 border border-slate-800 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <Shield size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-3">
            Security Restriction
          </h2>
          <p className="text-slate-400 mb-8 font-medium">
            Administrative privileges are required to view the user ledger.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full px-6 py-4 bg-emerald-500 text-slate-950 font-semibold rounded-2xl hover:bg-emerald-400 transition-all text-xs"
          >
            Authenticate Identity
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold mb-8">
          <span className="hover:text-emerald-400 transition-colors">
            Admin
          </span>
          <ChevronRight size={12} />
          <span className="text-slate-300">Identity Management</span>
        </div>

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold text-white mb-4 tracking-tight">
              User <span className="text-emerald-400">Vault.</span>
            </h1>
            <p className="text-slate-400 font-medium max-w-xl">
              High-level overview of system identities. Manage access tokens,
              roles, and security statuses.
            </p>
          </div>

          <div className="flex gap-4">
            <StatBox
              label="Total Registry"
              value={users.length}
              color="slate"
            />
            <StatBox label="Active Nodes" value={activeCount} color="emerald" />
          </div>
        </div>

        {/* Search & Intelligence Bar */}
        <div className="bg-slate-900/70 rounded-3xl p-6 border border-slate-800 shadow-2xl mb-10 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search
              size={20}
              className="absolute start-5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Search unique identifiers (Name, Email, Phone)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full ps-14 pe-12 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white font-medium focus:border-emerald-500 transition-all placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-900/50 px-6 py-4 rounded-2xl border border-slate-800">
            <Filter size={16} className="text-emerald-500" />
            <span>
              Results: <b className="text-white ms-1">{filteredUsers.length}</b>
            </span>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center">
            <Loader className="animate-spin text-emerald-500 mb-4" size={40} />
            <p className="text-slate-500 font-semibold text-xs">
              Decrypting User Data...
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-slate-900/70 rounded-3xl p-20 border border-slate-800 text-center">
            <Users size={60} className="mx-auto text-slate-800 mb-6" />
            <h3 className="text-2xl font-semibold text-white mb-2">
              Registry Empty
            </h3>
            <p className="text-slate-500">
              No identities match the current query.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/70 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-800">
                    <th className="px-8 py-6 text-start text-[11px] font-semibold text-slate-500">
                      System Identity
                    </th>
                    <th className="px-8 py-6 text-start text-[11px] font-semibold text-slate-500">
                      Communication Channels
                    </th>
                    <th className="px-8 py-6 text-start text-[11px] font-semibold text-slate-500">
                      Security Clearance
                    </th>
                    <th className="px-8 py-6 text-start text-[11px] font-semibold text-slate-500">
                      Auth Status
                    </th>
                    <th className="px-8 py-6 text-start text-[11px] font-semibold text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-900/30 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-white font-semibold group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                            {user.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white text-base">
                              {user.full_name}
                            </p>
                            <p className="text-[11px] font-bold text-slate-600 font-mono tracking-tighter">
                              UUID: {user.id?.slice(0, 12)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                            <Mail size={12} className="text-emerald-500" />{" "}
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                              <Phone size={12} className="text-emerald-500" />{" "}
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-8 py-6">
                        <StatusBadge active={user.is_active} />
                      </td>
                      <td className="px-8 py-6">
                        <button
                          onClick={() =>
                            handleToggleStatus(user.id, user.is_active)
                          }
                          className={`px-4 py-2 text-[11px] font-semibold   rounded-xl border transition-all ${
                            user.is_active
                              ? "border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white"
                              : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-slate-950"
                          }`}
                        >
                          {user.is_active ? "Revoke Access" : "Grant Access"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Vault Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900/70 rounded-3xl border border-red-500/20 shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)] max-w-md w-full p-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">
                Terminate Access?
              </h3>
              <p className="text-slate-400 mb-8 text-sm font-medium leading-relaxed">
                You are about to deactivate{" "}
                <span className="text-white font-bold">
                  {selectedUser?.name}
                </span>
                . They will lose all authentication privileges immediately.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelDeactivate}
                className="flex-1 px-5 py-4 bg-slate-900 text-slate-400 text-xs font-semibold rounded-2xl hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeactivate}
                className="flex-1 px-5 py-4 bg-red-500 text-white text-xs font-semibold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helper Components ---

const StatBox = ({ label, value, color }) => (
  <div
    className={`px-6 py-4 bg-slate-900/40 border ${
      color === "emerald" ? "border-emerald-500/20" : "border-slate-800"
    } rounded-2xl min-w-[140px]`}
  >
    <p className="text-[11px] font-semibold text-slate-500 mb-1">
      {label}
    </p>
    <p
      className={`text-3xl font-semibold ${
        color === "emerald" ? "text-emerald-400" : "text-white"
      }`}
    >
      {value}
    </p>
  </div>
);

const RoleBadge = ({ role }) => {
  const styles = {
    ADMIN: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    DEFAULT: "bg-slate-800 text-slate-400 border-slate-700",
  };
  const current = styles[role] || styles.DEFAULT;
  return (
    <span
      className={`px-3 py-1 text-[11px] font-semibold   rounded-lg border ${current}`}
    >
      {role || "USER"}
    </span>
  );
};

const StatusBadge = ({ active }) => (
  <span
    className={`flex items-center gap-2 text-[11px] font-semibold   ${
      active ? "text-emerald-500" : "text-red-500"
    }`}
  >
    <div
      className={`w-1.5 h-1.5 rounded-full ${
        active ? "bg-emerald-500 animate-pulse" : "bg-red-500"
      }`}
    />
    {active ? "Authenticated" : "Revoked"}
  </span>
);

export default ManageUsersPage;
