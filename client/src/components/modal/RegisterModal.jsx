import React, { useEffect, useState } from "react";
import AtharLogo from "../AtharLogo";
import {
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  Loader,
  Search,
  MapPin,
  Clock,
  X,
  Sparkles,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/auth.context";

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (fullName.trim().length < 3) {
      newErrors.fullName = "Full name must be at least 3 characters";
    }

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (phone.trim().length < 10) {
      newErrors.phone = "Phone number must be at least 10 characters";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
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

    const response = await register({
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      phone: phone.trim(),
    });

    if (response?.success) {
      onClose?.();
      navigate("/verify-email", {
        state: { email: email.trim(), verificationCode: response.data?.verificationCode },
      });
      return;
    }

    toast.error(response?.message || "Registration failed. Please try again.");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-950/40 "
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-5xl grid lg:grid-cols-2 bg-slate-900/95  rounded-3xl shadow-2xl shadow-emerald-500/10 overflow-hidden border border-emerald-500/20"
          >
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

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="p-6 md:p-10 lg:p-12 flex flex-col justify-center bg-slate-900/40 "
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="lg:hidden flex items-center gap-2.5 mb-6 justify-center"
              >
                <AtharLogo height={40} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8 text-center lg:text-start"
              >
                <h3 className="text-2xl font-bold text-white mb-2 flex items-center justify-center lg:justify-start gap-2">
                  Join Athar
                  <Sparkles size={20} className="text-emerald-400" />
                </h3>
                <p className="text-slate-300 text-sm">
                  Create an account to report lost items or claim found
                  belongings
                </p>
              </motion.div>

              {errors.submit && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-red-500/10 border-s-4 border-red-400 rounded-e-2xl flex items-center gap-3 mb-6"
                >
                  <AlertCircle className="text-red-400 shrink-0" size={20} />
                  <p className="text-sm text-red-300 font-semibold">
                    {errors.submit}
                  </p>
                </motion.div>
              )}

              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-200 mb-2.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        clearFieldError("fullName");
                      }}
                      className={`w-full h-12 bg-slate-900/50 border rounded-xl px-4 transition-all duration-200 outline-none text-white placeholder-slate-500 font-medium hover:bg-slate-900/70 ${
                        errors.fullName
                          ? "border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                          : "border-slate-700 focus:border-emerald-500 focus:bg-slate-900/70 focus:ring-2 focus:ring-emerald-500/20"
                      }`}
                    />
                    {errors.fullName && (
                      <p className="text-red-400 text-xs mt-2 font-semibold">
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-200 mb-2.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        clearFieldError("phone");
                      }}
                      className={`w-full h-12 bg-slate-900/50 border rounded-xl px-4 transition-all duration-200 outline-none text-white placeholder-slate-500 font-medium hover:bg-slate-900/70 ${
                        errors.phone
                          ? "border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                          : "border-slate-700 focus:border-emerald-500 focus:bg-slate-900/70 focus:ring-2 focus:ring-emerald-500/20"
                      }`}
                    />
                    {errors.phone && (
                      <p className="text-red-400 text-xs mt-2 font-semibold">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-200 mb-2.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError("email");
                    }}
                    className={`w-full h-12 bg-slate-900/50 border rounded-xl px-4 transition-all duration-200 outline-none text-white placeholder-slate-500 font-medium hover:bg-slate-900/70 ${
                      errors.email
                        ? "border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-700 focus:border-emerald-500 focus:bg-slate-900/70 focus:ring-2 focus:ring-emerald-500/20"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-2 font-semibold">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
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
                          clearFieldError("password");
                        }}
                        className={`w-full h-12 bg-slate-900/50 border rounded-xl px-4 pe-12 transition-all duration-200 outline-none text-white placeholder-slate-500 font-medium hover:bg-slate-900/70 ${
                          errors.password
                            ? "border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                            : "border-slate-700 focus:border-emerald-500 focus:bg-slate-900/70 focus:ring-2 focus:ring-emerald-500/20"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition-all"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-400 text-xs mt-2 font-semibold">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-200 mb-2.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          clearFieldError("confirmPassword");
                        }}
                        className={`w-full h-12 bg-slate-900/50 border rounded-xl px-4 pe-12 transition-all duration-200 outline-none text-white placeholder-slate-500 font-medium hover:bg-slate-900/70 ${
                          errors.confirmPassword
                            ? "border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                            : "border-slate-700 focus:border-emerald-500 focus:bg-slate-900/70 focus:ring-2 focus:ring-emerald-500/20"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
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
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 disabled:opacity-70 mt-4 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
                >
                  {isLoading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <UserPlus size={18} />
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
                  Already have an account?{" "}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    Sign in here
                    <Sparkles size={14} />
                  </motion.button>
                </p>
              </motion.div>
            </motion.div>

            {/* Right Side Branding with animation */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="hidden lg:flex relative bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/30 p-8 flex-col justify-between overflow-hidden"
            >
              {/* Animated particles */}
              <motion.div
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 5,
                  repeat: 0,
                  ease: "easeInOut",
                }}
                className="absolute top-0 start-0 w-72 h-72 bg-emerald-500/20 hidden rounded-full"
              />
              <motion.div
                animate={{
                  y: [0, 30, 0],
                  opacity: [0.15, 0.4, 0.15],
                }}
                transition={{
                  duration: 7,
                  repeat: 0,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="absolute bottom-0 end-0 w-64 h-64 bg-teal-500/15 hidden rounded-full"
              />

              <div className="relative z-10">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2.5 mb-8"
                >
                  <AtharLogo height={46} />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-4"
                >
                  Join Our{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                    Community
                  </span>
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                    Today
                  </span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-slate-300 text-base max-w-md leading-relaxed flex items-center gap-2"
                >
                  <Shield size={16} className="text-emerald-400 shrink-0" />
                  Report lost items, claim found belongings, and help reunite
                  people with what matters.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="relative z-10 grid grid-cols-2 gap-3"
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="bg-white/5  p-4 rounded-xl border border-emerald-500/20 hover:bg-white/10 hover:border-emerald-500/40 transition-all cursor-pointer"
                >
                  <UserPlus className="text-emerald-400 mb-2" size={24} />
                  <p className="text-white text-xs font-bold">
                    Free Registration
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    For all students & public
                  </p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="bg-white/5  p-4 rounded-xl border border-teal-500/20 hover:bg-white/10 hover:border-teal-500/40 transition-all cursor-pointer"
                >
                  <Search className="text-teal-400 mb-2" size={24} />
                  <p className="text-white text-xs font-bold">Report Items</p>
                  <p className="text-slate-400 text-[11px]">
                    Log found belongings easily
                  </p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="bg-white/5  p-4 rounded-xl border border-cyan-500/20 hover:bg-white/10 hover:border-cyan-500/40 transition-all cursor-pointer"
                >
                  <MapPin className="text-cyan-400 mb-2" size={24} />
                  <p className="text-white text-xs font-bold">Campus Ready</p>
                  <p className="text-slate-400 text-[11px]">
                    Built for busy spaces
                  </p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="bg-white/5  p-4 rounded-xl border border-amber-500/20 hover:bg-white/10 hover:border-amber-500/40 transition-all cursor-pointer"
                >
                  <Clock className="text-amber-400 mb-2" size={24} />
                  <p className="text-white text-xs font-bold">Faster Claims</p>
                  <p className="text-slate-400 text-[11px]">
                    Save time with automation
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RegisterModal;
