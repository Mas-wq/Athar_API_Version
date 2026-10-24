import React, { useState } from "react";
import AtharLogo from "../components/AtharLogo";
import { useSearchParams, useNavigate, Link } from "react-router";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import {
  Eye,
  EyeOff,
  Loader,
  CheckCircle,
  Lock,
  Shield,
  Zap,
  Clock,
  Mail,
} from "lucide-react";
import { PageShell } from "../components/layout";
import api from "../services/api.js";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");

  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!resetCode.trim()) {
      newErrors.resetCode = "Reset code is required";
    } else if (resetCode.trim().length !== 6) {
      newErrors.resetCode = "Reset code must be 6 digits";
    }

    if (!newPassword) {
      newErrors.newPassword = "Password is required";
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await api.resetPassword(
        email,
        resetCode.trim(),
        newPassword,
      );

      // Check success flag in response
      if (response.success) {
        setResetSuccess(true);
        toast.success("Password reset successfully! Redirecting to login...", {
          position: "bottom-right",
          theme: "dark",
        });
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else {
        // Show error message from backend
        toast.error(response.message || "Failed to reset password", {
          position: "bottom-right",
          theme: "dark",
        });
      }
    } catch (error) {
      toast.error(error.message || "Failed to reset password", {
        position: "bottom-right",
        theme: "dark",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return (
      <PageShell variant="wide">
        <div className="flex items-center justify-center px-4 py-12 relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center bg-slate-900/40  border border-emerald-500/20 rounded-3xl p-8 md:p-10"
          >
            <h2 className="text-2xl font-bold text-white mb-4">
              Invalid Reset Link
            </h2>
            <p className="text-slate-400 mb-8">
              The password reset link is missing required information.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              Request New Reset Link
            </Link>
          </motion.div>
        </div>
      </PageShell>
    );
  }

  if (resetSuccess) {
    return (
      <PageShell variant="wide">
        <div className="flex items-center justify-center px-4 py-12 relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full hidden animate-pulse"
              style={{ animationDuration: "6s" }}
            />
            <div
              className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full hidden animate-pulse"
              style={{ animationDuration: "8s", animationDelay: "2s" }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-5xl grid lg:grid-cols-2 bg-slate-900/95  rounded-3xl shadow-2xl shadow-emerald-500/10 overflow-hidden border border-emerald-500/20"
          >
            {/* Animated gradient background overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

            {/* Left Side Branding */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="hidden lg:flex relative bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/30 p-8 flex-col justify-between overflow-hidden"
            >
              <div className="relative z-10">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2.5 mb-8"
                >
                  <AtharLogo height={46} />
                </motion.div>

                <motion.h2 className="text-4xl font-bold text-white leading-tight mb-4">
                  Password
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                    Reset Successful
                  </span>
                </motion.h2>
                <p className="text-slate-300 text-base max-w-md leading-relaxed flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400" />
                  Your account is now secure
                </p>
              </div>

              <div className="relative z-10 grid grid-cols-2 gap-3">
                {[
                  {
                    icon: Lock,
                    label: "Password Updated",
                    desc: "Securely saved",
                    color: "text-emerald-400",
                    border: "border-emerald-500/20",
                  },
                  {
                    icon: Shield,
                    label: "Account Secure",
                    desc: "Protected now",
                    color: "text-teal-400",
                    border: "border-teal-500/20",
                  },
                  {
                    icon: Zap,
                    label: "Ready to Use",
                    desc: "Sign in anytime",
                    color: "text-cyan-400",
                    border: "border-cyan-500/20",
                  },
                  {
                    icon: Clock,
                    label: "Complete",
                    desc: "All done",
                    color: "text-amber-400",
                    border: "border-amber-500/20",
                  },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className={`bg-white/5  p-4 rounded-xl border ${item.border} hover:bg-white/10 transition-all cursor-pointer`}
                  >
                    <item.icon size={24} className={`${item.color} mb-2`} />
                    <p className="text-white text-xs font-bold">{item.label}</p>
                    <p className="text-slate-400 text-[11px]">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Side Content */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="p-6 md:p-10 lg:p-12 flex flex-col justify-center bg-slate-900/40  relative"
            >
              <div className="lg:hidden flex items-center gap-2.5 mb-6 justify-center">
                <AtharLogo height={40} />
              </div>

              <div className="mb-8 text-center lg:text-start">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-16 h-16 bg-emerald-500/20 border border-emerald-500 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-6"
                >
                  <CheckCircle size={32} className="text-emerald-400" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  You're All Set!
                </h3>
                <p className="text-slate-300 text-sm">
                  Your password has been successfully reset. You can now sign in
                  with your new password.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/login")}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
                >
                  <Lock size={18} />
                  <span>Go to Login</span>
                </motion.button>
              </div>

              <div className="border-t border-slate-700/50 pt-6">
                <p className="text-slate-400 text-sm text-center">
                  Need assistance?{" "}
                  <Link
                    to="/contact"
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    Contact support
                  </Link>
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell variant="wide">
      <div className="flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full hidden animate-pulse"
            style={{ animationDuration: "6s" }}
          />
          <div
            className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full hidden animate-pulse"
            style={{ animationDuration: "8s", animationDelay: "2s" }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          className="relative w-full max-w-5xl grid lg:grid-cols-2 bg-slate-900/95  rounded-3xl shadow-2xl shadow-emerald-500/10 overflow-hidden border border-emerald-500/20"
        >
          {/* Animated gradient background overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

          {/* Left Side Branding */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="hidden lg:flex relative bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/30 p-8 flex-col justify-between overflow-hidden"
          >
            <div className="relative z-10">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2.5 mb-8"
              >
                <AtharLogo height={46} />
              </motion.div>

              <motion.h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">
                Reset Your
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                  Password
                </span>
              </motion.h2>
              <p className="text-slate-300 text-base max-w-md leading-relaxed flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-400" />
                Secure your account with a new password
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3">
              {[
                {
                  icon: Lock,
                  label: "Secure Reset",
                  desc: "Code verified",
                  color: "text-emerald-400",
                  border: "border-emerald-500/20",
                },
                {
                  icon: Zap,
                  label: "Quick Setup",
                  desc: "2 minutes",
                  color: "text-teal-400",
                  border: "border-teal-500/20",
                },
                {
                  icon: Shield,
                  label: "Protected",
                  desc: "Strong password",
                  color: "text-cyan-400",
                  border: "border-cyan-500/20",
                },
                {
                  icon: CheckCircle,
                  label: "Instant Access",
                  desc: "Ready to sign in",
                  color: "text-amber-400",
                  border: "border-amber-500/20",
                },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className={`bg-white/5  p-4 rounded-xl border ${item.border} hover:bg-white/10 transition-all cursor-pointer`}
                >
                  <item.icon size={24} className={`${item.color} mb-2`} />
                  <p className="text-white text-xs font-bold">{item.label}</p>
                  <p className="text-slate-400 text-[11px]">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Side Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="p-6 md:p-10 lg:p-12 flex flex-col justify-center bg-slate-900/40  relative"
          >
            <div className="lg:hidden flex items-center gap-2.5 mb-6 justify-center">
              <AtharLogo height={40} />
            </div>

            <div className="mb-8 text-center lg:text-start">
              <h3 className="text-2xl font-bold text-white mb-3">
                Reset Password
              </h3>
              <p className="text-slate-300 text-sm">
                Enter the 6-digit code from your email and set a new password
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 mb-6">
              {/* Reset Code */}
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-2">
                  Reset Code
                </label>
                <input
                  type="text"
                  maxLength="6"
                  value={resetCode}
                  onChange={(e) => {
                    setResetCode(e.target.value.replace(/\D/g, ""));
                    clearFieldError("resetCode");
                  }}
                  placeholder="000000"
                  className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl transition-all duration-200 outline-none text-white placeholder-slate-500 font-medium text-center text-2xl  ${
                    errors.resetCode
                      ? "border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  }`}
                />
                {errors.resetCode && (
                  <p className="text-red-400 text-xs mt-2 font-semibold">
                    {errors.resetCode}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      clearFieldError("newPassword");
                    }}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 pe-12 bg-slate-900/50 border rounded-xl transition-all duration-200 outline-none text-white placeholder-slate-500 font-medium ${
                      errors.newPassword
                        ? "border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition-all"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-red-400 text-xs mt-2 font-semibold">
                    {errors.newPassword}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearFieldError("confirmPassword");
                    }}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 pe-12 bg-slate-900/50 border rounded-xl transition-all duration-200 outline-none text-white placeholder-slate-500 font-medium ${
                      errors.confirmPassword
                        ? "border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition-all"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-2 font-semibold">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 disabled:opacity-70 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    <span>Reset Password</span>
                  </>
                )}
              </motion.button>
            </form>

            <div className="border-t border-slate-700/50 pt-6">
              <p className="text-slate-400 text-sm text-center">
                Need help?{" "}
                <Link
                  to="/contact"
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Contact us
                </Link>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default ResetPasswordPage;
