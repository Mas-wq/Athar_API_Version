import React, { useState, useEffect } from "react";
import AtharLogo from "../AtharLogo";
import {
  Mail,
  Loader,
  CheckCircle,
  Lock,
  Shield,
  Zap,
  Clock,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import api from "../../services/api.js";

const ForgotPasswordModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [localResetCode, setLocalResetCode] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const validateEmail = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      const response = await api.forgotPassword(email.trim());

      if (response.success) {
        setSubmitted(true);
        setLocalResetCode(response.resetCode || "");
        toast.success("Password reset code sent! Check your email.", {
          position: "bottom-right",
          theme: "dark",
        });
      }
    } catch (error) {
      toast.error(error.message || "Failed to request password reset", {
        position: "bottom-right",
        theme: "dark",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setSubmitted(false);
    setLocalResetCode("");
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  // Success screen
  if (submitted) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/40 "
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-2xl bg-slate-900/95  rounded-3xl shadow-2xl shadow-emerald-500/10 overflow-hidden border border-emerald-500/20 p-8 md:p-12"
          >
            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClose}
              className="absolute end-4 top-4 p-2 rounded-full bg-slate-800/80 border border-white/10 text-slate-300 hover:text-white hover:border-emerald-400/60 hover:bg-slate-700 transition-all"
            >
              <X size={18} />
            </motion.button>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative z-10 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                className="w-20 h-20 bg-emerald-500/20 border border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle size={40} className="text-emerald-400" />
              </motion.div>

              <h2 className="text-3xl font-bold text-white mb-3">
                Check Your Email
              </h2>
              <p className="text-slate-300 mb-6">
                We've sent a 6-digit reset code to
                <br />
                <span className="text-emerald-400 font-semibold break-all">
                  {email}
                </span>
              </p>

              {localResetCode && (
                <div className="mb-6 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-center">
                  <p className="text-xs font-bold text-emerald-300">Local reset code</p>
                  <p className="mt-2 font-mono text-3xl font-semibold text-white">{localResetCode}</p>
                  <p className="mt-2 text-xs text-slate-300">Use this code on the reset password page.</p>
                </div>
              )}

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-8">
                <p className="text-emerald-300 text-sm font-medium flex items-center justify-center gap-2">
                  <Clock size={16} />
                  This code will expire in 15 minutes
                </p>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    window.location.href = `/reset-password?email=${encodeURIComponent(email)}`;
                  }}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20"
                >
                  <Lock size={18} />
                  Enter Reset Code
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClose}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                >
                  Back to Login
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setEmail("");
                    setSubmitted(false);
                  }}
                  className="w-full py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all"
                >
                  Try Another Email
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // Form screen
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-950/40 "
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-5xl grid lg:grid-cols-2 bg-slate-900/95  rounded-3xl shadow-2xl shadow-emerald-500/10 overflow-hidden border border-emerald-500/20"
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

            {/* Close button */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="absolute end-3 top-3 z-20"
            >
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-full bg-slate-800/80 border border-white/10 text-slate-300 hover:text-white hover:border-emerald-400/60 hover:bg-slate-700 hover:rotate-90 transition-all duration-300"
              >
                <X size={18} />
              </button>
            </motion.div>

            {/* Left Side */}
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
                  Recover Your
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                    Password
                  </span>
                </motion.h2>
                <p className="text-slate-300 text-base max-w-md leading-relaxed flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400" />
                  Request a reset code now
                </p>
              </div>

              <div className="relative z-10 grid grid-cols-2 gap-3">
                {[
                  {
                    icon: Lock,
                    label: "Secure Process",
                    desc: "OTP-protected",
                    color: "text-emerald-400",
                    border: "border-emerald-500/20",
                  },
                  {
                    icon: Zap,
                    label: "Instant Reset",
                    desc: "Get code now",
                    color: "text-teal-400",
                    border: "border-teal-500/20",
                  },
                  {
                    icon: Shield,
                    label: "Account Safe",
                    desc: "Verified security",
                    color: "text-cyan-400",
                    border: "border-cyan-500/20",
                  },
                  {
                    icon: Clock,
                    label: "15 Min Expiry",
                    desc: "Limited time",
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
                  Forgot Password?
                </h3>
                <p className="text-slate-300 text-sm">
                  Enter your email address and we'll send you a reset code
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-200 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({});
                    }}
                    placeholder="your@email.com"
                    className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl transition-all duration-200 outline-none text-white placeholder-slate-500 font-medium ${
                      errors.email
                        ? "border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-2 font-semibold">
                      {errors.email}
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
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      <span>Send Reset Code</span>
                    </>
                  )}
                </motion.button>
              </form>

              <div className="border-t border-slate-700/50 pt-6">
                <p className="text-slate-400 text-sm text-center">
                  Remember your password?{" "}
                  <button
                    onClick={() => {
                      handleClose();
                      onSwitchToLogin?.();
                    }}
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ForgotPasswordModal;
