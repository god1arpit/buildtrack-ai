import axios from "axios";
import { Capacitor } from "@capacitor/core";

const CONNECTION_CODE_PREFIX = "BT1-";

const encodeConnectionUrl = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const decodeConnectionUrl = (code) => {
  if (!String(code || "").startsWith(CONNECTION_CODE_PREFIX)) return String(code || "");
  const payload = String(code).slice(CONNECTION_CODE_PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(payload + "=".repeat((4 - (payload.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const createServerConnectionCode = (value) => {
  const decoded = decodeConnectionUrl(String(value || "").trim());
  const candidate = /^https?:\/\//i.test(decoded) ? decoded : `http://${decoded}`;
  const url = new URL(candidate);
  if (!url.hostname || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("Enter a valid server IP, HTTPS link, or BuildTrack connection code.");
  }
  // A connection code is a portable server locator, not an authentication secret.
  return `${CONNECTION_CODE_PREFIX}${encodeConnectionUrl(url.origin)}`;
};

// Dynamic resolver for API Host (Web vs Native Mobile App)
const normalizeServerHost = (value) => {
  let candidate = String(value || "").trim();
  if (!candidate) return "";

  try {
    candidate = decodeConnectionUrl(candidate);
    if (!/^https?:\/\//i.test(candidate)) candidate = `http://${candidate}`;
    const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `http://${candidate}`);
    return url.hostname ? `${url.protocol}//${url.hostname}` : "";
  } catch {
    return "";
  }
};

export const getServerHost = () => {
  const customIp = localStorage.getItem("buildtrack_server_ip");
  if (customIp) {
    const normalized = normalizeServerHost(customIp);
    if (normalized) return normalized;
  }

  // If running in Capacitor Native Platform or WebView on Android/iOS
  if (Capacitor.isNativePlatform()) {
    return normalizeServerHost(import.meta.env.VITE_BUILDTRACK_SERVER_HOST) || "http://192.168.0.101";
  }

  if (typeof window !== "undefined") {
    if (window.location.protocol === "capacitor:" || window.location.protocol === "file:") {
      return normalizeServerHost(import.meta.env.VITE_BUILDTRACK_SERVER_HOST) || "http://192.168.0.101";
    }
    // Cloudflare Pages hosts the static website separately from the existing
    // Render API. Keep API and uploaded-media requests pointed at that backend
    // instead of sending them to the Pages static host.
    if (window.location.hostname.endsWith(".pages.dev") || window.location.hostname.endsWith(".vercel.app")) {
      return "";
    }
    // If accessing from phone browser using local network IP (e.g. 192.168.0.101:5173)
    if (
      window.location.hostname &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      if (window.location.protocol === "https:") {
        return `${window.location.protocol}//${window.location.host}`;
      }
      return `http://${window.location.hostname}`;
    }
  }

  return "";
};

export const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
    const customIp = localStorage.getItem("buildtrack_server_ip");
    if (customIp && !customIp.includes("onrender.com")) {
      const normalized = normalizeServerHost(customIp);
      if (normalized) {
        if (normalized.startsWith("https://")) return `${normalized}/api`;
        return `${normalized}:5000/api`;
      }
    }
    // In web browser (localhost or phone on 192.168.x.x:5173), Vite dev proxy seamlessly forwards /api to port 5000
    if (window.location.port === "5173" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "/api";
    }
  }

  const host = getServerHost();
  if (host.startsWith("https://")) return `${host}/api`;
  if (host) {
    return `${host}:5000/api`;
  }
  return import.meta.env.VITE_API_URL || "/api";
};

export const getAiApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
    const customIp = localStorage.getItem("buildtrack_server_ip");
    if (customIp && !customIp.includes("onrender.com")) {
      const normalized = normalizeServerHost(customIp);
      if (normalized) {
        if (normalized.startsWith("https://")) return `${normalized}/ai-api/api`;
        return `${normalized}:8000/api`;
      }
    }
    if (window.location.port === "5173" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "/ai-api";
    }
  }

  const host = getServerHost();
  if (host.startsWith("https://")) return `${host}/ai-api/api`;
  if (host) {
    return `${host}:8000/api`;
  }
  return import.meta.env.VITE_AI_API_URL || "/ai-api";
};

// Helper to resolve media URLs (handles both /static/ from FastAPI and /uploads/ from Express)
export const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  const host =
    getServerHost() ||
    (typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
      ? `http://${window.location.hostname}`
      : "");

  if (host) {
    if (host.startsWith("https://")) return `${host}${url.startsWith("/") ? url : `/${url}`}`;
    if (url.startsWith("/static/")) {
      return `${host}:8000${url}`;
    }
    if (url.startsWith("/uploads/")) {
      return `${host}:5000${url}`;
    }
    return `${host}:8000${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
};

// Express BuildTrack Base Client (port 5000)
const api = axios.create({
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const token = localStorage.getItem("token") || localStorage.getItem("road_ai_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// FastAPI Computer Vision AI Client (port 8000)
export const aiApi = axios.create({
  // Road segmentation runs on the server CPU and can take longer for large
  // phone photos or a cold model process. Keep general AI calls bounded while
  // giving the road measurement endpoint enough time to finish.
  timeout: 180000,
});

aiApi.interceptors.request.use((config) => {
  config.baseURL = getAiApiBaseUrl();
  const token = localStorage.getItem("road_ai_token") || localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper services for AI Vision & Workflow
export const uploadAIInference = async (formData) => {
  const res = await aiApi.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data;
};

export const previewRoadMask = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await aiApi.post("/road-mask-preview", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
  return res.data;
};

export const measureRoadUnderConstruction = async (formData) => {
  const res = await aiApi.post("/road-measure", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 180000,
  });
  return res.data;
};

export const fetchAIDashboard = async (projectId = "default") => {
  const res = await aiApi.get(`/dashboard/${projectId}`);
  return res.data;
};

export const fetchAIAnalytics = async (projectId = "default") => {
  const res = await aiApi.get(`/analytics/${projectId}`);
  return res.data;
};

export const fetchAIPrediction = async (projectId = "default") => {
  const res = await aiApi.get(`/prediction/${projectId}`);
  return res.data;
};

export const fetchAIProgress = async (projectId = "default") => {
  const res = await aiApi.get(`/progress/${projectId}`);
  return res.data;
};

export const fetchAIReports = async (projectId = "default") => {
  const res = await aiApi.get(`/reports/${projectId}`);
  return res.data;
};

export const createAIReport = async (projectId = "default", payload = {}) => {
  const res = await aiApi.post(`/reports/${projectId}`, payload);
  return res.data;
};

export default api;
