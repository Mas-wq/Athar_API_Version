import React, { useEffect, useRef } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router"; // Fixed: use react-router-dom
import Navbar from "./components/Navbar";
import LoginModal from "./components/modal/LoginModal";
import RegisterModal from "./components/modal/RegisterModal";
import {
  AboutPage,
  ContactPage,
  HomePage,
  LoginPage,
  RegisterPage,
  VerificationPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  BrowseFoundItems,
  BrowseLostReports,
  HowItWorks,
  MyProfilePage,
  UpdateProfilePage,
  ChangePasswordPage,
  AddFoundItem,
  ManageUsersPage,
  ClaimItemPage,
  ClaimDetailsPage,
  AddLostItemReportPage,
  MyDashboardPage,
  UpdateReportPage,
  ClaimChatPage,
  ChatsPage,
  AdminDashboardPage,
  AiAssistantPage,
} from "./pages/index.js";
import Footer from "./components/Footer";

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const lastNonAuthPathRef = useRef("/");

  // Derive modal state from URL (no setState needed)
  const activeModal =
    location.pathname === "/login"
      ? "login"
      : location.pathname === "/register"
        ? "register"
        : null;

  // Scroll to top on every route change
  useEffect(() => {
    window.scrollTo(0, 0);

    // Track last non-auth path (using ref to avoid triggering re-renders)
    if (location.pathname !== "/login" && location.pathname !== "/register") {
      lastNonAuthPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  const openLoginModal = () => navigate("/login");
  const openRegisterModal = () => navigate("/register");

  const closeModal = () => {
    // Navigate back to where the user was before the modal opened
    navigate(lastNonAuthPathRef.current, { replace: true });
  };

  const switchToRegister = () => navigate("/register", { replace: true });
  const switchToLogin = () => navigate("/login", { replace: true });

  return (
    <div className="relative flex flex-col min-h-screen text-slate-100">
      <div className="athar-backdrop" aria-hidden="true" />
      <div className="nav-mask" aria-hidden="true" />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[100] focus:rounded-xl focus:bg-emerald-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Skip to content
      </a>
      <Navbar
        onLoginClick={openLoginModal}
        onRegisterClick={openRegisterModal}
      />

      <div className="athar-page-reveal relative z-10 flex flex-1 flex-col">
        <main id="main-content" className="relative flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerificationPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/found-items" element={<BrowseFoundItems />} />
            <Route path="/lost-reports" element={<BrowseLostReports />} />
            <Route path="/how-it-works" element={<HowItWorks />} />

            {/* User Routes */}
            <Route path="/my-profile" element={<MyProfilePage />} />
            <Route path="/my-dashboard" element={<MyDashboardPage />} />
            <Route path="/update-profile" element={<UpdateProfilePage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/claim/:itemId" element={<ClaimItemPage />} />
            <Route path="/claims/:id" element={<ClaimDetailsPage />} />
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/ai-assistant" element={<AiAssistantPage />} />
            <Route path="/chats/:id" element={<ClaimChatPage />} />
            <Route path="/report-lost-item" element={<AddLostItemReportPage />} />
            <Route
              path="/update-lost-report/:id"
              element={<UpdateReportPage />}
            />

            {/* Community found item posting and admin routes */}
            <Route path="/add-found-item" element={<AddFoundItem />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/manage-users" element={<ManageUsersPage />} />
          </Routes>
        </main>

        <Footer />
      </div>

      {/* Modals are rendered conditionally based on activeModal state.
          This allows the background page to remain visible if desired.
      */}
      {activeModal === "login" && (
        <LoginModal
          isOpen={true}
          onClose={closeModal}
          onSwitchToRegister={switchToRegister}
        />
      )}

      {activeModal === "register" && (
        <RegisterModal
          isOpen={true}
          onClose={closeModal}
          onSwitchToLogin={switchToLogin}
        />
      )}
    </div>
  );
};

export default App;
