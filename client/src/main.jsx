import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router";
import { ToastContainer } from "react-toastify";
import { MotionConfig } from "framer-motion";
import { AuthProvider } from "./context/auth.context";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import "react-toastify/dist/ReactToastify.css";

try {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("athar-ai-chat-"))
    .forEach((key) => localStorage.removeItem(key));
} catch {
  // Browser storage may be unavailable; server-side Redis remains the temporary history store.
}

// localhost and 127.0.0.1 have separate browser cookies and local storage.
// Keep the app on one origin so a refresh cannot appear to switch accounts.
if (window.location.hostname === "127.0.0.1") {
  const canonicalUrl = new URL(window.location.href);
  canonicalUrl.hostname = "localhost";
  window.location.replace(canonicalUrl.href);
} else {
  createRoot(document.getElementById("root")).render(
    <BrowserRouter>
      <AuthProvider>
        <AppErrorBoundary>
          <MotionConfig reducedMotion="user">
            <App />
          </MotionConfig>
        </AppErrorBoundary>
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover={true}
          theme="dark"
          toastClassName="athar-toast"
          bodyClassName="athar-toast-body"
          limit={3}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
