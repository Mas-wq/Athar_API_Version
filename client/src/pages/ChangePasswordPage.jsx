import React, { useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { toast } from "react-toastify";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  X,
  ChevronRight,
  ShieldAlert,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../context/auth.context";
import { PageShell } from "../components/layout";
import { AccessCard } from "../components/ui";

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  if (!isAuthenticated) {
    return (
        <AccessCard
          icon={ShieldAlert}
          title="Security Clearance Required"
          description="Please authenticate to access sensitive credential management."
        />
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.currentPassword.trim())
      newErrors.currentPassword = "Current credentials required";
    if (formData.newPassword.length < 6)
      newErrors.newPassword = "Minimum 6 character sequence required";
    if (formData.newPassword !== formData.confirmPassword)
      newErrors.confirmPassword = "Sequence mismatch detected";
    if (formData.currentPassword === formData.newPassword)
      newErrors.newPassword = "New sequence must be unique";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await api.put("/auth/change-password", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      toast.success(
        "Security credentials rotated. Re-authentication required.",
        { theme: "dark" }
      );

      // Logout and force fresh login after 2 seconds
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Credential update failed", {
        theme: "dark",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold mb-12">
          <button
            onClick={() => navigate("/my-profile")}
            className="hover:text-emerald-400 transition-colors"
          >
            Identity
          </button>
          <ChevronRight size={12} />
          <span className="text-slate-300">Credential Rotation</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
          {/* Glow Decor */}
          <div className="absolute top-0 end-0 w-32 h-32 bg-emerald-500/5 hidden pointer-events-none" />

          <div className="p-10 border-b border-slate-800 bg-slate-900/30">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <KeyRound size={20} />
              </div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">
                Security Protocol.
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Rotating your access credentials will invalidate all current
              sessions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8">
            <div className="space-y-6">
              {/* Field: Current Password */}
              <PasswordField
                label="Existing Credentials"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                error={errors.currentPassword}
                show={showPass.current}
                onToggle={() =>
                  setShowPass((p) => ({ ...p, current: !p.current }))
                }
                placeholder="••••••••"
              />

              <div className="h-px bg-slate-800/50 my-2" />

              {/* Field: New Password */}
              <PasswordField
                label="New Access Sequence"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                error={errors.newPassword}
                show={showPass.new}
                onToggle={() => setShowPass((p) => ({ ...p, new: !p.new }))}
                placeholder="Min. 6 characters"
              />

              {/* Field: Confirm Password */}
              <PasswordField
                label="Verify New Sequence"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={errors.confirmPassword}
                show={showPass.confirm}
                onToggle={() =>
                  setShowPass((p) => ({ ...p, confirm: !p.confirm }))
                }
                placeholder="Repeat new sequence"
              />
            </div>

            {/* Security Checklist */}
            <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <h4 className="text-[11px] font-semibold text-slate-500 flex items-center gap-2">
                <ShieldCheck size={12} className="text-emerald-500" />
                Safety Requirements
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Requirement
                  label="Different from current"
                  met={
                    formData.newPassword !== formData.currentPassword &&
                    formData.newPassword !== ""
                  }
                />
                <Requirement
                  label="6+ characters"
                  met={formData.newPassword.length >= 6}
                />
                <Requirement
                  label="Matches verification"
                  met={
                    formData.newPassword === formData.confirmPassword &&
                    formData.newPassword !== ""
                  }
                />
              </ul>
            </div>

            {/* Footer Actions */}
            <div className="pt-8 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate("/my-profile")}
                className="flex-1 px-8 py-4 bg-slate-900 text-slate-400 text-[11px] font-semibold rounded-2xl hover:text-white transition-all"
              >
                Abort Rotation
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-[2] flex items-center justify-center gap-3 px-8 py-4 bg-emerald-500 text-slate-950 text-[11px] font-semibold rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Lock size={16} />
                    Update Credentials & Logout
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

// --- Helper Components ---

const PasswordField = ({
  label,
  name,
  value,
  onChange,
  error,
  show,
  onToggle,
  placeholder,
}) => (
  <div className="space-y-3">
    <label className="text-[11px] font-semibold text-slate-500 ms-1">
      {label}
    </label>
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full bg-slate-950 border px-6 py-4 rounded-2xl text-white font-bold transition-all focus:outline-none placeholder:text-slate-500 ${
          error
            ? "border-rose-500/50 focus:border-rose-500"
            : "border-slate-800 focus:border-emerald-500"
        }`}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute end-6 top-1/2 -translate-y-1/2 text-slate-600 hover:text-emerald-500 transition-colors"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
    {error && (
      <p className="text-[9px] font-semibold text-rose-500 ms-4">
        {error}
      </p>
    )}
  </div>
);

const Requirement = ({ label, met }) => (
  <li className="flex items-center gap-2">
    <div
      className={`w-1.5 h-1.5 rounded-full ${
        met ? "bg-emerald-500" : "bg-slate-700"
      }`}
    />
    <span
      className={`text-[11px] font-bold ${
        met ? "text-slate-300" : "text-slate-600"
      }`}
    >
      {label}
    </span>
  </li>
);

export default ChangePasswordPage;
