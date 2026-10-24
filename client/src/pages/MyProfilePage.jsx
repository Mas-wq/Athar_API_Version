import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/auth.context";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import {
  User,
  Mail,
  Phone,
  Shield,
  ArrowLeft,
  Loader2,
  Edit2,
  Lock,
  Calendar,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { PageShell } from "../components/layout";
import { AccessCard } from "../components/ui";

const MyProfilePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const response = await api.get("/auth/profile");
        setUser(response.data.user);
      } catch (error) {
        toast.error("Telemetry sync failed", { theme: "dark" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [isAuthenticated]);

  if (isLoading) {
    return (
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-emerald-500" />
          <p className="text-[11px] font-semibold text-slate-500">
            Authenticating Session...
          </p>
        </div>
    );
  }

  if (!user) {
    return (
        <AccessCard
          icon={ShieldCheck}
          title="Identity Required"
          description="Please authenticate to access your personal profile dossier."
        />
    );
  }

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold mb-12">
          <button
            onClick={() => navigate(-1)}
            className="hover:text-emerald-400 transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={12} /> Portal
          </button>
          <ChevronRight size={12} />
          <span className="text-slate-300">Identity Profile</span>
        </div>

        <div className="relative">
          {/* Background Glow Effect */}
          <div className="absolute -top-24 -start-24 w-64 h-64 bg-emerald-500/10 rounded-full hidden pointer-events-none" />

          <div className="flex flex-col md:flex-row gap-10">
            {/* Profile Sidebar / Identity Card */}
            <div className="w-full md:w-72 space-y-6">
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 text-center flex flex-col items-center shadow-2xl">
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/20 rotate-3">
                    <User size={40} className="text-white -rotate-3" />
                  </div>
                  <div className="absolute -bottom-2 -end-2 w-8 h-8 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-emerald-500">
                    <ShieldCheck size={16} />
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-white tracking-tight mb-1">
                  {user.full_name}
                </h2>
                <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
                  {user.role} Status
                </span>

                <div className="w-full h-px bg-slate-800 my-8" />

                <button
                  onClick={() => navigate("/update-profile")}
                  className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-slate-800 text-white text-[11px] font-semibold rounded-2xl hover:bg-slate-700 transition-all border border-slate-700/50"
                >
                  <Edit2 size={14} />
                  Edit Profile
                </button>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield size={14} className="text-emerald-500" />
                  <span className="text-[9px] font-semibold text-slate-500">
                    Security Health
                  </span>
                </div>
                <div className="space-y-3">
                  <SecurityPoint
                    label="Email Verified"
                    active={user.email_verified}
                  />
                  <SecurityPoint
                    label="Account Active"
                    active={user.is_active}
                  />
                </div>
              </div>
            </div>

            {/* Main Dossier Content */}
            <div className="flex-1 space-y-6">
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-10 shadow-xl">
                <h3 className="text-xs font-semibold text-slate-500 mb-10 border-b border-slate-800 pb-6">
                  Identity Specifications
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                  <ProfileField
                    label="Primary Identity"
                    value={user.full_name}
                  />
                  <ProfileField
                    label="Digital Address"
                    value={user.email}
                    isMono
                  />
                  <ProfileField
                    label="Contact Telemetry"
                    value={user.phone || "Not Linked"}
                  />
                  <ProfileField
                    label="Registry Since"
                    value={new Date(user.created_at).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  />
                </div>

                <div className="mt-16 flex items-center justify-between p-6 bg-slate-950/50 border border-slate-800 rounded-3xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                      <Lock size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 leading-none mb-1">
                        Access Credentials
                      </p>
                      <p className="text-sm font-bold text-slate-300">
                        Rotate security password
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/change-password")}
                    className="px-6 py-3 bg-slate-900 border border-slate-700 text-white text-[11px] font-semibold rounded-xl hover:bg-slate-800 transition-all"
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

// --- Sub-Components ---

const ProfileField = ({ label, value, isMono }) => (
  <div className="flex flex-col">
    <span className="text-[9px] font-semibold text-slate-600 mb-2">
      {label}
    </span>
    <span
      className={`text-lg font-bold text-white ${
        isMono ? "font-mono tracking-tight text-emerald-400" : ""
      }`}
    >
      {value}
    </span>
  </div>
);

const SecurityPoint = ({ label, active }) => (
  <div className="flex items-center justify-between">
    <span className="text-[11px] font-bold text-slate-500">{label}</span>
    <div
      className={`w-1.5 h-1.5 rounded-full ${
        active
          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
          : "bg-slate-700"
      }`}
    />
  </div>
);

export default MyProfilePage;
