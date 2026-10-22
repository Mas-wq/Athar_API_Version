import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/auth.context";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import {
  User,
  Phone,
  ArrowLeft,
  Loader2,
  Save,
  X,
  Fingerprint,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { PageShell } from "../components/layout";
import { AccessCard } from "../components/ui";

const UpdateProfilePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });

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
        setFormData({
          full_name: response.data.user.full_name || "",
          phone: response.data.user.phone || "",
        });
      } catch (error) {
        toast.error("Telemetry sync failed", { theme: "dark" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [isAuthenticated]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.full_name.trim())
      newErrors.full_name = "Identity string required";
    if (!formData.phone.trim()) {
      newErrors.phone = "Contact telemetry required";
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = "Invalid character sequence";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await api.patch("/auth/profile", formData);
      toast.success("Profile registry updated", { theme: "dark" });
      setTimeout(() => navigate("/my-profile"), 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Registry update failed", {
        theme: "dark",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-emerald-500" />
          <p className="text-[11px] font-semibold text-slate-500">
            Accessing Registry...
          </p>
        </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
        <AccessCard
          icon={ShieldAlert}
          title="Identity Required"
          description="Authentication is necessary to modify secure profile data."
        />
    );
  }

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold mb-12">
          <button
            onClick={() => navigate("/my-profile")}
            className="hover:text-emerald-400 transition-colors"
          >
            Profile
          </button>
          <ChevronRight size={12} />
          <span className="text-slate-300">Update Dossier</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Dossier Header */}
          <div className="p-10 border-b border-slate-800 bg-slate-900/30 flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
              <Fingerprint size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">
                Modify Identity.
              </h1>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">
                Currently Editing:{" "}
                <span className="text-slate-300">{user.email}</span>
              </p>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSave} className="p-10 space-y-8">
            <div className="grid grid-cols-1 gap-8">
              {/* Full Name Input */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                  <User size={14} className="text-emerald-500" />
                  Full Legal Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className={`w-full bg-slate-950 border px-6 py-4 rounded-2xl text-white font-bold transition-all focus:outline-none placeholder:text-slate-500 ${
                    errors.full_name
                      ? "border-rose-500/50 focus:border-rose-500"
                      : "border-slate-800 focus:border-emerald-500"
                  }`}
                  placeholder="John Doe"
                />
                {errors.full_name && (
                  <p className="text-[11px] font-semibold text-rose-500 ms-2">
                    {errors.full_name}
                  </p>
                )}
              </div>

              {/* Phone Input */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                  <Phone size={14} className="text-emerald-500" />
                  Contact Telemetry (Phone)
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full bg-slate-950 border px-6 py-4 rounded-2xl text-white font-bold transition-all focus:outline-none placeholder:text-slate-500 ${
                    errors.phone
                      ? "border-rose-500/50 focus:border-rose-500"
                      : "border-slate-800 focus:border-emerald-500"
                  }`}
                  placeholder="+1 234 567 890"
                />
                {errors.phone && (
                  <p className="text-[11px] font-semibold text-rose-500 ms-2">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Action Area */}
            <div className="pt-10 mt-10 border-t border-slate-800 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate("/my-profile")}
                className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-slate-400 text-[11px] font-semibold rounded-2xl hover:text-white transition-all"
              >
                <X size={16} />
                Abort Changes
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-emerald-500 text-slate-950 text-[11px] font-semibold rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Save size={16} />
                    Commit to Registry
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
};

export default UpdateProfilePage;
