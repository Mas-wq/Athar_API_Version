import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "../context/auth.context";
import { api } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion"; // Added for modern feel
import {
  ArrowRight,
  ChevronDown,
  HelpCircle,
  Home,
  Info,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Search,
  User,
  X,
  LayoutDashboard,
  AlertCircle,
  Link2,
  Package,
  Bot,
  Moon,
  Sun,
} from "lucide-react";
import AtharLogo from "./AtharLogo";

const Navbar = ({ onLoginClick = () => {}, onRegisterClick = () => {} }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );

  // console.log(user);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
  }, [isMobileMenuOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const favicon = document.getElementById("athar-theme-favicon");
    if (favicon) favicon.href = `/branding/logos/athar-mark-${theme}.svg`;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = theme === "light" ? "#f3f7f5" : "#0a0f13";
    try {
      window.localStorage.setItem("athar-theme", theme);
    } catch {
      // The selected theme still applies for this session if storage is unavailable.
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => current === "dark" ? "light" : "dark");
  const nextTheme = theme === "dark" ? "light" : "dark";
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setUnreadMessageCount(0);
      return undefined;
    }

    let active = true;
    const refreshUnreadCount = () => {
      api.get("/chat/unread-count")
        .then(({ data }) => {
          if (active) setUnreadMessageCount(Number(data.unread_count) || 0);
        })
        .catch(() => {
          if (active) setUnreadMessageCount(0);
        });
    };
    refreshUnreadCount();
    const timer = window.setInterval(refreshUnreadCount, 10000);
    window.addEventListener("focus", refreshUnreadCount);
    window.addEventListener("athar:unread-refresh", refreshUnreadCount);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshUnreadCount);
      window.removeEventListener("athar:unread-refresh", refreshUnreadCount);
    };
  }, [isAuthenticated, user?.id]);

  const navLinks = user?.role === "ADMIN"
    ? [
        { to: "/", label: "Home", icon: Home },
        { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/found-items", label: "Found Items", icon: Search },
        { to: "/lost-reports", label: "Lost Reports", icon: AlertCircle },
        { to: "/manage-users", label: "Users", icon: User },
        { to: "/chats", label: "Chats", icon: Mail },
        { to: "/ai-assistant", label: "Athar AI", icon: Bot },
      ]
    : [
        { to: "/", label: "Home", icon: Home },
        { to: "/found-items", label: "Found Items", icon: Search },
        { to: "/lost-reports", label: "Lost Reports", icon: AlertCircle },
        { to: "/report-lost-item", label: "Report Lost", icon: AlertCircle },
        { to: "/add-found-item", label: "Add Found", icon: Package },
        ...(user ? [
          { to: "/chats", label: "Chats", icon: Mail },
          { to: "/ai-assistant", label: "Athar AI", icon: Bot },
        ] : []),
      ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setShowLogoutConfirm(false);
    setIsLoggingOut(true);
    await logout();
    setIsMobileMenuOpen(false);
    setIsLoggingOut(false);
    navigate("/");
  };

  const unreadBadge = (label) =>
    label === "Chats" && unreadMessageCount > 0 ? (
      <span
        aria-label={`${unreadMessageCount} unread messages`}
        className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white"
      >
        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
      </span>
    ) : null;

  const menuItem =
    "flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/[0.06] focus-visible:bg-white/[0.06] rounded-lg transition-colors";

  return (
    <>
      {/* Floating navbar */}
      <header className="fixed top-3 inset-x-0 z-50 flex justify-center px-3 sm:px-4 pointer-events-none">
        <nav
          aria-label="Main"
          className="w-full max-w-7xl rounded-2xl border border-white/10 bg-slate-950/70  shadow-[0_18px_44px_-22px_rgb(0_0_0/0.7)] pointer-events-auto"
        >
          <div className="px-3 sm:px-4 lg:px-5">
            <div className="flex justify-between items-center h-20 gap-3">
              {/* Logo */}
              <Link
                to="/"
                aria-label="Athar home"
                className="flex items-center shrink-0 rounded-lg transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                <AtharLogo height={72} />
              </Link>

              {/* Desktop links */}
              <ul className="hidden lg:flex items-center gap-0.5 rounded-xl bg-white/[0.04] p-1 border border-white/[0.06]">
                {navLinks.map(({ to, label, icon: NavIcon }) => {
                  const Icon = NavIcon;
                  return (
                  <li key={to}>
                    <Link
                      to={to}
                      aria-current={isActive(to) ? "page" : undefined}
                      className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-200 ${
                        isActive(to)
                          ? "text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {isActive(to) && (
                        <motion.span
                          layoutId="nav-bg"
                          transition={{ type: "spring", stiffness: 420, damping: 36 }}
                          className="absolute inset-0 rounded-lg bg-white/[0.09] border border-white/10"
                        />
                      )}
                      <Icon
                        size={15}
                        aria-hidden="true"
                        className={`relative hidden xl:block ${isActive(to) ? "text-emerald-300" : ""}`}
                      />
                      <span className="relative flex items-center gap-2 whitespace-nowrap">
                        {label}
                        {unreadBadge(label)}
                      </span>
                    </Link>
                  </li>
                  );
                })}
              </ul>

              {/* Desktop auth */}
              <div className="hidden lg:flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${nextTheme} mode`}
                  aria-pressed={theme === "light"}
                  title={`Switch to ${nextTheme} mode`}
                  className="p-2 text-slate-300 hover:text-white rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <ThemeIcon size={17} aria-hidden="true" />
                </button>
                {isAuthenticated ? (
                  <div
                    className="relative"
                    onMouseEnter={() => setShowUserDropdown(true)}
                    onMouseLeave={() => setShowUserDropdown(false)}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) setShowUserDropdown(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setShowUserDropdown(false);
                    }}
                  >
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={showUserDropdown}
                      onClick={() => setShowUserDropdown((v) => !v)}
                      className="flex items-center gap-2 ps-1.5 pe-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-full transition-colors group cursor-pointer"
                    >
                      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[11px] font-semibold text-slate-950">
                        {user?.full_name?.charAt(0).toUpperCase() || "U"}
                      </span>
                      <span className="text-sm font-medium text-slate-200 group-hover:text-white">
                        {user?.full_name?.split(" ")[0]}
                      </span>
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className={`text-slate-500 transition-transform ${
                          showUserDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {showUserDropdown && (
                        <motion.div
                          role="menu"
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.97 }}
                          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute end-0 top-full pt-2 w-60 origin-top-right"
                        >
                          <div className="rounded-2xl border border-white/10 bg-slate-900/95  shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)] p-2">
                            <div className="px-3 py-3 mb-1.5 bg-white/[0.04] rounded-xl">
                              <p className="text-xs text-slate-500 font-medium">
                                Signed in as
                              </p>
                              <p dir="auto" className="text-sm text-white truncate font-medium mt-0.5">
                                {user?.full_name}
                              </p>
                              <span className="mt-1.5 inline-flex text-[11px] bg-emerald-400/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/20">
                                {user?.role}
                              </span>
                            </div>
                            <Link to="/my-profile" role="menuitem" className={menuItem}>
                              <User size={16} aria-hidden="true" /> My Profile
                            </Link>
                            {user?.role === "USER" && (
                              <Link to="/my-dashboard" role="menuitem" className={menuItem}>
                                <LayoutDashboard size={16} aria-hidden="true" /> My Dashboard
                              </Link>
                            )}
                            {user?.role === "ADMIN" && (
                              <Link to="/admin/dashboard" role="menuitem" className={menuItem}>
                                <LayoutDashboard size={16} aria-hidden="true" /> Admin Dashboard
                              </Link>
                            )}
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => setShowLogoutConfirm(true)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <LogOut size={16} aria-hidden="true" /> Logout
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={onLoginClick}
                      className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-white/[0.06] cursor-pointer transition-colors"
                    >
                      <LogIn size={16} aria-hidden="true" />
                      Login
                    </button>
                    <button
                      onClick={onRegisterClick}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors active:scale-[0.98] cursor-pointer"
                    >
                      Join now
                      <ArrowRight size={16} aria-hidden="true" className="rtl:rotate-180" />
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu trigger */}
              <div className="lg:hidden flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${nextTheme} mode`}
                  aria-pressed={theme === "light"}
                  title={`Switch to ${nextTheme} mode`}
                  className="p-2 text-slate-300 hover:text-white rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <ThemeIcon size={17} aria-hidden="true" />
                </button>
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  aria-label="Open menu"
                  aria-expanded={isMobileMenuOpen}
                  className="p-2 -me-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <Menu size={22} />
                </button>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/70  z-[60]"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed top-0 end-0 bottom-0 w-[300px] max-w-[85vw] bg-slate-900/95  z-[70] border-s border-white/10 p-5 flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <AtharLogo height={56} />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-2 bg-white/[0.06] hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} className="text-slate-300" />
                </button>
              </div>

              <div className="flex-1 space-y-1 overflow-y-auto">
                {navLinks.map(({ to, label, icon: NavIcon }) => {
                  const Icon = NavIcon;
                  return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={isActive(to) ? "page" : undefined}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                      isActive(to)
                        ? "bg-white/[0.08] text-white border border-white/10"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-white border border-transparent"
                    }`}
                  >
                    <Icon size={18} aria-hidden="true" className={isActive(to) ? "text-emerald-300" : ""} />
                    <span className="flex flex-1 items-center justify-between font-medium text-[15px]">
                      {label}
                      {unreadBadge(label)}
                    </span>
                  </Link>
                  );
                })}
              </div>

              <div className="pt-5 border-t border-white/[0.07] space-y-2.5">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/my-profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 p-3 text-slate-200 bg-white/[0.05] border border-white/10 rounded-xl font-medium text-sm"
                    >
                      <User size={16} aria-hidden="true" /> My Profile
                    </Link>
                    <button
                      onClick={() => setShowLogoutConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-rose-500/10 text-rose-400 rounded-xl font-medium text-sm cursor-pointer"
                    >
                      <LogOut size={18} /> Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onLoginClick();
                      }}
                      className="flex items-center justify-center gap-2 w-full p-3 text-slate-200 border border-white/10 bg-white/[0.04] rounded-xl text-sm font-medium cursor-pointer"
                    >
                      <LogIn size={18} />
                      Login
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onRegisterClick();
                      }}
                      className="flex items-center justify-center gap-2 w-full p-3 bg-emerald-400 text-slate-950 rounded-xl font-semibold text-sm cursor-pointer"
                    >
                      Get Started
                      <ArrowRight size={18} className="rtl:rotate-180" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Logout confirmation */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-slate-950/80 "
            />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="logout-title"
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-sm surface rounded-3xl p-8 text-center"
            >
              <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-rose-500/20">
                <LogOut size={24} />
              </div>
              <h3 id="logout-title" className="text-xl font-semibold text-white mb-2">
                Ready to leave?
              </h3>
              <p className="text-slate-400 text-sm mb-7">
                You'll need to log back in to manage your items.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="p-3 text-sm font-semibold text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="p-3 text-sm font-semibold text-white bg-rose-500 hover:bg-rose-400 rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isLoggingOut ? "Closing..." : "Logout"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
