import React, { useState, useEffect } from "react";
import AtharLogo from "../components/AtharLogo";
import { useNavigate, useLocation, Link } from "react-router"; // Ensure this matches your react-router version (usually react-router-dom)
import {
  Mail,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Loader,
  Clock,
  Shield,
  Zap,
  Search,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useAuth } from "../context/auth.context";
import { PageShell } from "../components/layout";

const VerificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const { verifyEmail, resendVerificationCode, isLoading } = useAuth();

  // Form States
  const [verificationCode, setVerificationCode] = useState(
    location.state?.verificationCode || "",
  );
  const [localVerificationCode, setLocalVerificationCode] = useState(
    location.state?.verificationCode || "",
  );
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errors, setErrors] = useState({});

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      navigate("/register");
    }
  }, [email, navigate]);

  // Handle resend cooldown
  useEffect(() => {
    let interval;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Validate verification code
  const validateCode = () => {
    const newErrors = {};
    if (!verificationCode.trim()) {
      newErrors.code = "Verification code is required";
    } else if (verificationCode.length !== 6) {
      newErrors.code = "Code must be exactly 6 digits";
    } else if (!/^\d{6}$/.test(verificationCode)) {
      newErrors.code = "Code must contain only numbers";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateCode()) return;

    const result = await verifyEmail(verificationCode, email);

    if (result.success) {
      toast.success("Registration complete! Welcome to Athar 🎉", {
        position: "top-center",
        autoClose: 5000,
      });

      // Navigate to home after delay
      setTimeout(() => {
        navigate("/");
      }, 2500);
    } else {
      setErrors({
        submit: result.error || "Verification failed. Please check your code.",
      });
    }
  };

  // Handle resend code
  const handleResendCode = async () => {
    setErrors({});
    setResendLoading(true);

    const result = await resendVerificationCode(email);

    setResendLoading(false);

    if (result.success) {
      toast.success(result.message || "New code sent to your email!", {
        position: "top-center",
        autoClose: 5000,
      });
      setLocalVerificationCode(result.verificationCode || "");
      if (result.verificationCode) setVerificationCode(result.verificationCode);
      setResendCooldown(60);
    } else {
      toast.error(result.error || "Failed to resend code", {
        position: "top-center",
        autoClose: 4000,
      });
    }
  };

  if (!email) return null;

  return (
    <PageShell variant="wide">
      <div className="flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: "6s" }}
          />
          <div
            className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: "8s", animationDelay: "2s" }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          className="relative w-full max-w-5xl grid lg:grid-cols-2 bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-emerald-500/10 overflow-hidden border border-emerald-500/20"
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
                <AtharLogo height={40} />
              </motion.div>

              <motion.h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">
                Secure Your
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                  Account
                </span>
              </motion.h2>
              <p className="text-slate-300 text-base max-w-md leading-relaxed flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-400" />
                One step away from joining Athar
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3">
              {[
                {
                  icon: Shield,
                  label: "Secure Verification",
                  desc: "OTP-based safety",
                  color: "text-emerald-400",
                  border: "border-emerald-500/20",
                },
                {
                  icon: Zap,
                  label: "Instant Access",
                  desc: "Start reporting items",
                  color: "text-teal-400",
                  border: "border-teal-500/20",
                },
                {
                  icon: Search,
                  label: "Smart Matching",
                  desc: "Find lost items fast",
                  color: "text-cyan-400",
                  border: "border-cyan-500/20",
                },
                {
                  icon: Users,
                  label: "Active Community",
                  desc: "Help each other",
                  color: "text-amber-400",
                  border: "border-amber-500/20",
                },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className={`bg-white/5 backdrop-blur-md p-4 rounded-xl border ${item.border} hover:bg-white/10 transition-all cursor-pointer`}
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
            className="p-6 md:p-10 lg:p-12 flex flex-col justify-center bg-slate-900/40 backdrop-blur-sm relative"
          >
            <div className="lg:hidden flex items-center gap-2.5 mb-6 justify-center">
              <AtharLogo height={34} />
            </div>

            <div className="mb-8 text-center lg:text-start">
              <h3 className="text-2xl font-bold text-white mb-2">
                Verify Your Email
              </h3>
              <p className="text-slate-300 text-sm">
                We sent a 6-digit code to
                <br />
                <span className="text-emerald-400 font-semibold break-all">
                  {email}
                </span>
              </p>
            </div>

            {localVerificationCode && (
              <div className="mb-6 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-4 text-center shadow-lg shadow-emerald-950/20">
                <p className="text-xs font-bold text-emerald-300">Local verification code</p>
                <p className="mt-2 font-mono text-3xl font-semibold text-white" aria-label={`Verification code ${localVerificationCode}`}>{localVerificationCode}</p>
                <p className="mt-2 text-xs text-slate-300">Enter this code in the box below. It expires in 5 minutes.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength="6"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setVerificationCode(value);
                    if (errors.code) setErrors({ ...errors, code: "" });
                  }}
                  className={`w-full h-14 rounded-xl border px-4 py-3 text-center text-3xl font-bold  text-white transition-all bg-slate-900/50 focus:outline-none ${
                    errors.code
                      ? "border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                      : "border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  }`}
                />
                {errors.code && (
                  <p className="text-xs text-red-400 mt-2 font-semibold">
                    {errors.code}
                  </p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 disabled:opacity-70 mt-2 shadow-lg shadow-emerald-500/20"
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    <span>Verify Email</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Resend Code Section */}
            <div className="mt-8 pt-8 border-t border-slate-700/50">
              <p className="text-center text-sm text-slate-300 mb-4">
                Didn't receive the code?
              </p>
              {resendCooldown > 0 ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400 p-3 bg-slate-700/20 rounded-lg">
                  <Clock size={16} className="text-amber-400" />
                  <span>
                    Resend in{" "}
                    <span className="font-bold text-amber-400">
                      {resendCooldown}s
                    </span>
                  </span>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendLoading}
                  className="w-full px-6 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {resendLoading ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <Mail size={16} />
                  )}
                  <span>{resendLoading ? "Sending..." : "Resend Code"}</span>
                </motion.button>
              )}
            </div>

            <div className="mt-8 text-center">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Registration
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default VerificationPage;
