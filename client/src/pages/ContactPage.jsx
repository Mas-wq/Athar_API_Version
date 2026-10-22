import React, { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  ShieldCheck,
  Clock,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";
import { motion } from "framer-motion"; // eslint-disable-line no-unused-vars
import { PageShell } from "../components/layout";
import api from "../services/api.js";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.subject.trim()) newErrors.subject = "Subject is required";
    if (!formData.message.trim()) newErrors.message = "Message is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const response = await api.sendContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });

      if (response.success) {
        toast.success(response.message || "Message sent successfully!", {
          position: "bottom-right",
          theme: "dark",
        });
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        toast.error(response.message || "Failed to send message", {
          position: "bottom-right",
          theme: "dark",
        });
      }
    } catch (error) {
      toast.error(error.message || "An error occurred. Please try again.", {
        position: "bottom-right",
        theme: "dark",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      className="relative bg-transparent overflow-hidden"
      containerClassName="max-w-6xl"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 py-12 lg:py-20">
        {/* --- Header --- */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-6"
          >
            <ShieldCheck size={14} /> Operations Support
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-semibold text-white mb-6">
            How can we <span className="text-emerald-400">help?</span>
          </h1>
          <p className="text-slate-400 text-lg font-medium">
            Reach out to our verification officers for assistance with lost
            reports, claim status, or institutional partnerships.
          </p>
        </div>

        {/* --- Contact Channels --- */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <ContactMethod
            icon={<Mail className="text-emerald-400" />}
            title="Email Support"
            value="support@athar.local"
            sub="Avg. response: 4 hours"
            link="mailto:support@athar.local"
          />
          <ContactMethod
            icon={<Phone className="text-emerald-400" />}
            title="Hotline"
            value="+20 000 000 0000"
            sub="08:00 – 22:00, Daily"
            link="tel:+200000000000"
          />
          <ContactMethod
            icon={<MapPin className="text-emerald-400" />}
            title="Cairo HQ"
            value="Nasr City Service Desk"
            sub="Verified Item Pickup"
          />
        </div>

        {/* --- Main Content Layout --- */}
        <div className="grid lg:grid-cols-5 gap-12 items-start">
          {/* Form Side */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 bg-slate-900/40 border border-slate-800 p-8 md:p-10 rounded-3xl backdrop-blur-md"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <InputField
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  placeholder="Full Name"
                />
                <InputField
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  placeholder="mail@example.com"
                />
              </div>
              <InputField
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                error={errors.subject}
                placeholder="How can we assist you?"
              />
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 ms-1">
                  Message Details
                </label>
                <textarea
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  className={`w-full px-5 py-4 bg-slate-950 border rounded-2xl text-white focus:outline-none transition-all resize-none ${
                    errors.message
                      ? "border-red-500/50"
                      : "border-slate-800 focus:border-emerald-500"
                  }`}
                  placeholder="Please provide item reference numbers if applicable..."
                />
                {errors.message && (
                  <p className="text-xs text-red-400 mt-2">{errors.message}</p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  "Processing..."
                ) : (
                  <>
                    <Send size={18} strokeWidth={3} /> Submit Inquiry
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* Guidelines Side */}
          <div className="lg:col-span-2 space-y-6">
            <GuideBox
              icon={<Clock size={20} />}
              title="Response Policy"
              desc="Inquiries are handled in order of urgency. ID documents and medical assets are prioritized."
            />
            <GuideBox
              icon={<Info size={20} />}
              title="Verification Tip"
              desc="To speed up recovery, mention specific identifiers like scratches, unique serials, or internal contents."
            />
            <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800">
              <h4 className="text-white font-bold mb-4">
                Institutional Inquiries
              </h4>
              <p className="text-slate-400 text-sm mb-6">
                Looking to implement Athar at your airport, hospital, or
                university?
              </p>
              <button className="text-emerald-400 text-sm font-bold flex items-center gap-2 hover:gap-3 transition-all">
                Contact Sales Engineering <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

// --- Sub-components ---

const ContactMethod = ({ icon, title, value, sub, link }) => (
  <motion.a
    href={link}
    whileHover={{ y: -5 }}
    className="block p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/30 transition-all text-center"
  >
    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
      {icon}
    </div>
    <h3 className="text-white font-bold mb-1">{title}</h3>
    <p className="text-emerald-50 font-medium mb-1 truncate">{value}</p>
    <p className="text-slate-500 text-xs font-bold tracking-tight">
      {sub}
    </p>
  </motion.a>
);

const InputField = ({ label, error, ...props }) => (
  <div className="flex-1">
    <label className="block text-xs font-bold text-slate-400 mb-2 ms-1">
      {label}
    </label>
    <input
      {...props}
      className={`w-full px-5 py-4 bg-slate-950 border rounded-2xl text-white focus:outline-none transition-all ${
        error
          ? "border-red-500/50"
          : "border-slate-800 focus:border-emerald-500"
      }`}
    />
    {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
  </div>
);

const GuideBox = ({ icon, title, desc }) => (
  <div className="flex gap-4 p-6 rounded-2xl bg-slate-900/20 border border-slate-800/50">
    <div className="text-emerald-500 mt-1">{icon}</div>
    <div>
      <h4 className="text-white font-bold text-sm mb-1">{title}</h4>
      <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
    </div>
  </div>
);

const ArrowRight = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14m-7-7 7 7-7 7" />
  </svg>
);

export default ContactPage;
