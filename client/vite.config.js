import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const forwardPublicOrigin = (proxy) => {
  proxy.on("proxyReq", (proxyReq, req) => {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || (String(host || "").includes("trycloudflare.com") ? "https" : "http");
    if (host) proxyReq.setHeader("x-forwarded-host", host);
    proxyReq.setHeader("x-forwarded-proto", String(proto).split(",")[0].trim());
  });
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_BUILDTRACK_SERVER_HOST': JSON.stringify(process.env.VITE_BUILDTRACK_SERVER_HOST || 'http://192.168.0.101'),
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || '/api'),
    'import.meta.env.VITE_AI_API_URL': JSON.stringify(process.env.VITE_AI_API_URL || '/ai-api'),
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/ai-api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai-api(?:\/api)?/, "/api"),
        configure: forwardPublicOrigin,
      },
      "/static": {
        target: "http://localhost:8000",
        changeOrigin: true,
        configure: forwardPublicOrigin,
      },
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        configure: forwardPublicOrigin,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
        configure: forwardPublicOrigin,
      },
    },
  },
});