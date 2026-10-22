import axios from "axios";

// Local-only API: Vite proxies requests to the Express server.
const baseURL = "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true, // ensure cookies are sent
});
