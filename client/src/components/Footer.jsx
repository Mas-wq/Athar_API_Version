import React, { useState } from "react";
import AtharLogo from "./AtharLogo";
import { Link, useNavigate } from "react-router";
import { toast } from "react-toastify";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  ArrowRight,
  Bell,
} from "lucide-react";

const Footer = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  // Define which routes are implemented
  const implementedRoutes = [
    "/found-items",
    "/lost-reports",
    "/how-it-works",
    "/register",
    "/contact",
  ];

  const getToastTheme = () =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark";

  const handleLinkClick = (to) => {
    if (!implementedRoutes.includes(to)) {
      toast.info("🚀 This feature will be implemented soon!", {
        position: "bottom-right",
        theme: getToastTheme(),
      });
    } else {
      navigate(to);
    }
  };

  const footerLinks = {
    platform: [
      { label: "Browse Items", to: "/found-items" },
      { label: "Lost Reports", to: "/lost-reports" },
      { label: "How It Works", to: "/how-it-works" },
      { label: "Success Stories", to: "/stories" },
      { label: "Get Started", to: "/register" },
    ],
    support: [
      { label: "Help Center", to: "/help" },
      { label: "Safety Tips", to: "/safety" },
      { label: "Contact Us", to: "/contact" },
      { label: "FAQ", to: "/faq" },
    ],
    legal: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Cookie Policy", to: "/cookies" },
    ],
  };

  const linkClass =
    "text-sm text-slate-400 hover:text-white transition-colors text-start cursor-pointer rounded-md";
  const columnTitle = "text-white text-sm font-semibold mb-5";

  return (
    <footer className="relative mt-8 text-slate-300">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 pt-16 pb-10">
        {/* Newsletter */}
        <div className="surface rounded-3xl p-7 md:p-10 mb-14">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-7">
            <div className="max-w-md">
              <div className="flex items-center gap-2.5 mb-2">
                <Bell size={18} className="text-emerald-300" aria-hidden="true" />
                <h5 className="text-lg font-semibold text-white">Stay Updated</h5>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Get notified when items matching your lost belongings are found.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="relative shrink-0">
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email..."
                className="w-full md:w-80 bg-white/[0.04] border border-white/10 rounded-xl py-3 ps-4 pe-14 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/70 focus:bg-white/[0.06] transition-colors"
              />
              <button
                type="submit"
                className="absolute end-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-lg transition-colors cursor-pointer"
                aria-label="Subscribe"
              >
                <ArrowRight size={17} className="rtl:rotate-180" />
              </button>
              {subscribed && (
                <div
                  role="status"
                  className="absolute -bottom-7 start-0 text-xs text-emerald-300 font-medium"
                >
                  ✓ Thanks for subscribing!
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Brand + links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16 mb-14">
          <div>
            <Link to="/" aria-label="Athar home" className="inline-flex items-center mb-6">
              <AtharLogo height={50} />
            </Link>

            <p className="text-sm leading-relaxed text-slate-400 mb-7 max-w-sm">
              Egypt's trusted lost & found platform connecting people with
              their lost belongings through secure community verification and
              innovative technology.
            </p>

            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm">
                <span className="p-2 bg-white/[0.05] border border-white/10 rounded-lg">
                  <Phone size={15} className="text-emerald-300" aria-hidden="true" />
                </span>
                <a href="tel:+200000000000" className="hover:text-white transition-colors" dir="ltr">
                  +20 000 000 0000
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <span className="p-2 bg-white/[0.05] border border-white/10 rounded-lg">
                  <Mail size={15} className="text-emerald-300" aria-hidden="true" />
                </span>
                <a href="mailto:support@athar.local" className="hover:text-white transition-colors">
                  support@athar.local
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <span className="p-2 bg-white/[0.05] border border-white/10 rounded-lg">
                  <MapPin size={15} className="text-emerald-300" aria-hidden="true" />
                </span>
                <span className="leading-relaxed">
                  Cairo, Egypt
                  <br />
                  <span className="text-xs text-slate-500">Serving Across Egypt</span>
                </span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-10">
            {[
              ["Platform", footerLinks.platform],
              ["Support", footerLinks.support],
              ["Legal", footerLinks.legal],
            ].map(([title, links]) => (
              <nav key={title} aria-label={title}>
                <h4 className={columnTitle}>{title}</h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <button onClick={() => handleLinkClick(link.to)} className={linkClass}>
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="border-t border-white/[0.07] pt-7 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <p className="text-xs text-slate-500">
              © {currentYear} Athar | أثر. All rights reserved.
            </p>

            <div className="flex items-center gap-2">
              {[
                { icon: Facebook, label: "Facebook" },
                { icon: Twitter, label: "Twitter" },
                { icon: Linkedin, label: "LinkedIn" },
                { icon: Instagram, label: "Instagram" },
              ].map(
                (
                  { icon: Icon, label }, // eslint-disable-line no-unused-vars
                ) => (
                  <button
                    key={label}
                    onClick={() =>
                      toast.info(`🚀 ${label} link coming soon!`, {
                        position: "bottom-right",
                        theme: getToastTheme(),
                      })
                    }
                    aria-label={label}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.09] hover:border-white/20 transition-colors cursor-pointer"
                  >
                    <Icon size={16} />
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2">
            <span className="me-1 text-xs font-medium text-slate-500">Payment methods:</span>
            {["InstaPay", "Orange Cash", "Vodafone Cash", "PayPal"].map((method) => (
              <span
                key={method}
                className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-slate-300"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
