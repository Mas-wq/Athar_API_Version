import React, { useEffect, useState } from "react";
import AtharLogo from "../AtharLogo";
import {
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  Loader,
  Search,
  ShieldCheck,
  Zap,
  MapPin,
  Users,
  X,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; // eslint-disable-line no-unused-vars
import { useNavigate } from "react-router";
import { toast } from "react-toastify";
import { useAuth } from "../../context/auth.context";
import ForgotPasswordModal from "./ForgotPasswordModal";

const LoginModal = ({ isOpen, onClose, onSwitchToRegister }) => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid professional email";
    }
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Security requires at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const result = await login(email, password);
    if (result.success) {
      toast.success("Welcome back! Syncing your data...", {
        position: "top-center",
        autoClose: 3000,
      });
      setTimeout(() => {
        navigate("/");
        onClose?.();
      }, 800);
    } else {
      setErrors({
        submit:
          result.error || "Authentication failed. Please check credentials.",
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-5xl grid lg:grid-cols-2 bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-emerald-500/10 overflow-hidden border border-emerald-500/20"
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="absolute end-3 top-3 z-20"
            >
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full bg-slate-800/80 border border-white/10 text-slate-300 hover:text-white hover:border-emerald-400/60 hover:bg-slate-700 hover:rotate-90 transition-all duration-300"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </motion.div>

            {/* Left Side Branding with animation */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="hidden lg:flex relative bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/30 p-8 flex-col justify-between overflow-hidden"
            >
              {/* Floating particles effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 4,
                    repeat: 0,
                    ease: "easeInOut",
                  }}
                  className="absolute top-20 start-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"
                />
                <motion.div
                  animate={{
                    y: [0, 20, 0],
                    opacity: [0.2, 0.5, 0.2],
                  }}
                  transition={{
                    duration: 5,
                    repeat: 0,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                  className="absolute bottom-20 end-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl"
                />
              </div>

              <div className="relative z-10">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2.5 mb-8"
                >
                  <AtharLogo height={40} />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-4"
                >
                  Smart{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                    Lost & Found
                  </span>
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                    Management
                  </span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-slate-300 text-base max-w-md leading-relaxed flex items-center gap-2"
                >
                  <Sparkles size={16} className="text-emerald-400" />
                  Digitalize your lost and found operations.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="relative z-10 grid grid-cols-2 gap-3"
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-emerald-500/20 hover:bg-white/10 hover:border-emerald-500/40 transition-all cursor-pointer"
                >
                  <ShieldCheck size={24} className="text-emerald-400 mb-2" />
                  <p className="text-white text-xs font-bold">
                    Secure Platform
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Protected data & claims
                  </p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-teal-500/20 hover:bg-white/10 hover:border-teal-500/40 transition-all cursor-pointer"
                >
                  <Zap size={24} className="text-teal-400 mb-2" />
                  <p className="text-white text-xs font-bold">AI Matching</p>
                  <p className="text-slate-400 text-[11px]">
                    Smart auto-linking
                  </p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-cyan-500/20 hover:bg-white/10 hover:border-cyan-500/40 transition-all cursor-pointer"
                >
                  <MapPin size={24} className="text-cyan-400 mb-2" />
                  <p className="text-white text-xs font-bold">Item Tracking</p>
                  <p className="text-slate-400 text-[11px]">Real-time status</p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-amber-500/20 hover:bg-white/10 hover:border-amber-500/40 transition-all cursor-pointer"
                >
                  <Users size={24} className="text-amber-400 mb-2" />
                  <p className="text-white text-xs font-bold">Multi-Role</p>
                  <p className="text-slate-400 text-[11px]">
                    User & Admin Access
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right Side Form with animation */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="p-6 md:p-10 lg:p-12 flex flex-col justify-center bg-slate-900/40 backdrop-blur-sm relative"
            >
              <div className="lg:hidden flex items-center gap-2.5 mb-6 justify-center">
                <AtharLogo height={34} />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8 text-center lg:text-start"
              >
                <h3 className="text-2xl font-bold text-white mb-2">
                  Welcome Back
                </h3>
                <p className="text-slate-300 text-sm">
                  Sign in to manage operations
                </p>
              </motion.div>

              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {errors.submit && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-red-500/10 border-s-4 border-red-400 rounded-e-2xl flex items-center gap-3"
                  >
                    <AlertCircle className="text-red-400 shrink-0" size={20} />
                    <p className="text-sm text-red-300 font-semibold">
                      {errors.submit}
                    </p>
                  </motion.div>
                )}

                <motion.div
                  whileFocus={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <label className="block text-sm font-bold text-slate-200 mb-2.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: "" });
                    }}
                    className={`w-full h-12 bg-slate-900/50 border rounded-xl px-4 text-white outline-none transition-all duration-300 hover:bg-slate-900/70 focus:bg-slate-900/70 ${
                      errors.email
                        ? "border-red-500/50 focus:border-red-400"
                        : "border-slate-700 focus:border-emerald-500"
                    }`}
                  />
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-xs mt-2 font-semibold"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div
                  whileFocus={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <label className="block text-sm font-bold text-slate-200 mb-2.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password)
                          setErrors({ ...errors, password: "" });
                      }}
                      className={`w-full h-12 bg-slate-900/50 border rounded-xl px-4 pe-12 text-white outline-none transition-all duration-300 hover:bg-slate-900/70 focus:bg-slate-900/70 ${
                        errors.password
                          ? "border-red-500/50 focus:border-red-400"
                          : "border-slate-700 focus:border-emerald-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 p-1.5 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-xs mt-2 font-semibold"
                    >
                      {errors.password}
                    </motion.p>
                  )}

                  {/* Forgot Password Link */}
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-emerald-400 text-xs font-semibold hover:underline mt-2"
                  >
                    Forgot password?
                  </button>
                </motion.div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 disabled:opacity-70 mt-4 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <LogIn size={18} />
                    </>
                  )}
                </motion.button>
              </motion.form>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-10 text-center"
              >
                <p className="text-slate-400 text-sm">
                  Don't have an account?{" "}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={onSwitchToRegister}
                    className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    Join our community
                    <Sparkles size={14} />
                  </motion.button>
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      )}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onSwitchToLogin={() => setShowForgotPassword(false)}
      />
    </AnimatePresence>
  );
};

export default LoginModal;
