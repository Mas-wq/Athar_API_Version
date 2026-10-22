import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { api } from "../lib/api";
import { toast } from "react-toastify";

// Create Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  // console.log("AuthProvider rendered");
  // State Management
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        const storedUser = localStorage.getItem("user");
        // console.log("Stored user from localStorage:", storedUser);

        // Optimistic hydration from storage to prevent UI flash
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
          } catch (_err) {
            localStorage.removeItem("user");
          }
        }

        // Always verify session via profile (cookie-based)
        try {
          const response = await api.get("/auth/profile");

          if (
            Object.prototype.hasOwnProperty.call(
              response.data.user,
              "is_active"
            ) &&
            !response.data.user.is_active
          ) {
            setError("Your account has been deactivated");
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem("user");
            return;
          }

          setUser(response.data.user);
          setIsAuthenticated(true);
          localStorage.setItem("user", JSON.stringify(response.data.user));
          setError(null);
        } catch (err) {
          // Session invalid or missing; keep cached user to avoid abrupt disappear
          // but mark authentication false. This avoids localStorage wiping when
          // the cookie isn't sent (e.g., CORS/sameSite issues).
          setUser(null);
          setIsAuthenticated(false);
          setError(null);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // A browser cookie is shared by tabs on this origin. Keep each tab's UI
  // identity in sync when another tab signs in or out, so cached account data
  // is never shown under the wrong user's name.
  useEffect(() => {
    const syncUserAcrossTabs = (event) => {
      if (event.key !== "user" && event.key !== null) return;
      try {
        const nextUser = event.newValue ? JSON.parse(event.newValue) : null;
        setUser(nextUser);
        setIsAuthenticated(Boolean(nextUser));
        setError(null);
      } catch {
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
      }
    };

    window.addEventListener("storage", syncUserAcrossTabs);
    return () => window.removeEventListener("storage", syncUserAcrossTabs);
  }, []);

  // Login function
  const login = useCallback(async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post("/auth/login", { email, password });

      const userData = response.data.user;

      // Check if user is active
      if (!userData.is_active) {
        setError("Your account has been deactivated");
        setIsAuthenticated(false);
        return { success: false, error: "Account deactivated" };
      }

      // Store user data
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem("user", JSON.stringify(userData));

      return { success: true };
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Login failed";
      setError(errorMessage);
      setIsAuthenticated(false);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.post("/auth/register", userData);

      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Registration failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify Email function
  const verifyEmail = useCallback(async (code, email) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get("/auth/verify-email", {
        params: { code, email },
      });

      const userData = response.data.user;

      // User is automatically logged in after verification
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem("user", JSON.stringify(userData));

      return { success: true };
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Verification failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Resend Verification Code
  const resendVerificationCode = useCallback(async (email) => {
    try {
      setError(null);

      const response = await api.get("/auth/resend-verification-code", {
        params: { email },
      });

      return {
        success: true,
        message: response.data.message,
        verificationCode: response.data.verificationCode,
      };
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to resend code";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);

      // Try to call logout endpoint
      try {
        await api.post("/auth/logout");
      } catch (err) {
        // Continue logout even if endpoint fails
        console.error("Logout endpoint error:", err);
      }

      // Clear local state and storage
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      localStorage.removeItem("user");

      toast.success("Logged out successfully", {
        position: "top-center",
        autoClose: 2000,
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check and refresh user status (for detecting deactivation)
  const checkUserStatus = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await api.get("/auth/profile");
      const updatedUser = response.data.user;

      // If user was deactivated, logout
      if (!updatedUser.is_active) {
        logout();
        toast.error("Your account has been deactivated", {
          position: "top-center",
          autoClose: 4000,
        });
        return false;
      }

      // Update user data if it changed
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return true;
    } catch (err) {
      console.error("Status check error:", err);
      // If token is invalid, logout
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
      return false;
    }
  }, [isAuthenticated, logout]);

  // Get user's role
  const getRole = useCallback(() => {
    return user?.role || null;
  }, [user]);

  // Check if user has specific role
  const hasRole = useCallback(
    (role) => {
      return user?.role === role;
    },
    [user]
  );

  // Check if user is admin
  const isAdmin = useCallback(() => {
    return user?.role === "ADMIN";
  }, [user]);

  // Check if user is regular user
  const isUser = useCallback(() => {
    return user?.role === "USER";
  }, [user]);

  // Check if user is active
  const isActive = useCallback(() => {
    return user?.is_active === true;
  }, [user]);

  // Value object to provide to consumers
  const value = {
    // State
    user,
    isLoading,
    isAuthenticated,
    error,

    // Functions
    login,
    register,
    logout,
    verifyEmail,
    resendVerificationCode,
    checkUserStatus,

    // Helper functions
    getRole,
    hasRole,
    isAdmin,
    isUser,
    isActive,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom Hook to use Auth Context
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export default AuthContext;
