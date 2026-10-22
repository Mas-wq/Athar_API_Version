const API_BASE_URL = "";

const api = {
  getUserClaimDetails: async (token, claimId) => {
    const response = await fetch(`${API_BASE_URL}/api/user/claims/${claimId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to fetch claim details");
    return data;
  },
  getAllClaimsByUser: async (token) => {
    const response = await fetch(`${API_BASE_URL}/api/user/claims`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to fetch claims");
    return data;
  },
  userClaimItem: async (token, itemId, claimDetails, imageUrls = []) => {
    const response = await fetch(
      `${API_BASE_URL}/api/user/claim-item/${itemId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          claim_details: claimDetails,
          image_urls: imageUrls,
        }),
      },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to claim item");
    return data;
  },
  // ...existing code...
  deleteUserLostReport: async (token, reportId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/user/lost-reports/${reportId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to delete lost report");
    return data;
  },
  // Auth endpoints
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Registration failed");
    return data;
  },

  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Login failed");
    return data;
  },

  getProfile: async (token) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to fetch profile");
    return data;
  },

  verifyEmail: async (code, email) => {
    const response = await fetch(
      `${API_BASE_URL}/api/auth/verify-email?code=${code}&email=${email}`,
      { method: "GET" },
    );
    if (!response.ok) throw new Error("Email verification failed");
    return response.text();
  },

  resendVerificationCode: async (email) => {
    const response = await fetch(
      `${API_BASE_URL}/api/auth/resend-verification-code?email=${email}`,
      { method: "GET" },
    );
    if (!response.ok) throw new Error("Failed to resend verification code");
    return response.text();
  },

  forgotPassword: async (email) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to request password reset");
    return data;
  },

  resetPassword: async (email, code, newPassword) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to reset password");
    return data;
  },

  // Item endpoints
  getAllFoundItems: async (token = null) => {
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/api/items/found-items`, {
      method: "GET",
      headers,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch items");
    return data;
  },

  getFoundItemById: async (id, token = null) => {
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(
      `${API_BASE_URL}/api/items/found-items/${id}`,
      {
        method: "GET",
        headers,
      },
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch item");
    return data;
  },

  reportLostItem: async (token, itemData) => {
    const response = await fetch(`${API_BASE_URL}/api/user/report-lost-item`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(itemData),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to report lost item");
    return data;
  },

  getUserLostReports: async (token) => {
    const response = await fetch(`${API_BASE_URL}/api/user/lost-reports`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to fetch lost reports");
    return data;
  },

  updateUserLostReport: async (token, reportId, updateData) => {
    const response = await fetch(
      `${API_BASE_URL}/api/user/lost-reports/${reportId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to update lost report");
    return data;
  },

  getLostReportById: async (id, token = null) => {
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(
      `${API_BASE_URL}/api/user/lost-reports/${id}`,
      {
        method: "GET",
        headers,
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "Failed to fetch lost report");
    return data;
  },

  deleteUserClaim: async (token, claimId) => {
    const response = await fetch(`${API_BASE_URL}/api/user/claims/${claimId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to delete claim");
    return data;
  },
  updateUserClaim: async (token, claimId, claimData) => {
    const response = await fetch(`${API_BASE_URL}/api/user/claims/${claimId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(claimData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to update claim");
    return data;
  },

  // Contact endpoints
  sendContactMessage: async (contactData) => {
    const response = await fetch(`${API_BASE_URL}/api/contact/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contactData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to send message");
    return data;
  },
};

export default api;
