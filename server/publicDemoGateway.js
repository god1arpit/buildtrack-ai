import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, "../client/dist");
const listenPort = Number(process.env.PUBLIC_DEMO_PORT || 4173);
const appOrigin = process.env.PUBLIC_DEMO_APP_ORIGIN || "http://127.0.0.1:5100";
const aiOrigin = process.env.PUBLIC_DEMO_AI_ORIGIN || "http://127.0.0.1:8100";
const aiPaths = new Set([
  "/api/health",
  "/api/road-measure",
  "/api/road-mask-preview",
  "/api/upload",
]);
const inferenceRequests = new Map();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    // Capacitor's Android WebView uses a different origin from the public
    // tunnel. Keep gateway errors readable by the app instead of surfacing
    // them as a generic browser network error.
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Authorization, Content-Type",
  });
  response.end(JSON.stringify(body));
}

function proxyRequest(request, response, target, targetPath, { forwardPublicHost = false } = {}) {
  const headers = { ...request.headers, host: new URL(target).host };
  if (forwardPublicHost) {
    headers.host = request.headers.host;
    headers["x-forwarded-proto"] = "https";
    headers["x-forwarded-host"] = request.headers.host;
  }

  const upstream = http.request(`${target}${targetPath}`, {
    method: request.method,
    headers,
  }, (upstreamResponse) => {
    const responseHeaders = { ...upstreamResponse.headers };
    delete responseHeaders["content-encoding"];
    response.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
    upstreamResponse.pipe(response);
  });

  upstream.on("error", () => {
    if (!response.headersSent) sendJson(response, 502, { message: "A demo service is unavailable." });
    else response.destroy();
  });
  request.pipe(upstream);
}

function allowInference(request, response) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    sendJson(response, 401, { detail: "Sign in to BuildTrack before running AI analysis." });
    return false;
  }

  const now = Date.now();
  const ip = request.socket.remoteAddress || "unknown";
  const current = inferenceRequests.get(ip);
  const bucket = !current || now - current.startedAt >= 60_000
    ? { startedAt: now, count: 0 }
    : current;
  bucket.count += 1;
  inferenceRequests.set(ip, bucket);
  if (bucket.count > 8) {
    sendJson(response, 429, { detail: "Demo inference limit reached. Please wait one minute and try again." });
    return false;
  }

  const validation = http.get(`${appOrigin}/api/auth/me`, { headers: { authorization } }, (result) => {
    result.resume();
    if (result.statusCode !== 200) {
      sendJson(response, 401, { detail: "Your demo session expired. Sign in again." });
      return;
    }
    const url = new URL(request.url || "/", "http://demo.local");
    proxyRequest(request, response, aiOrigin, url.pathname.replace(/^\/ai-api/, "") + url.search, { forwardPublicHost: true });
  });
  validation.on("error", () => sendJson(response, 502, { message: "The demo app API is unavailable." }));
  return false;
}

const gateway = http.createServer((request, response) => {
  const url = new URL(request.url || "/", "http://demo.local");
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    proxyRequest(request, response, appOrigin, pathname + url.search);
    return;
  }

  if (pathname === "/ai-api/api/health") {
    proxyRequest(request, response, aiOrigin, "/api/health" + url.search, { forwardPublicHost: true });
    return;
  }

  if (pathname.startsWith("/ai-api/api/")) {
    const targetPath = pathname.replace(/^\/ai-api/, "");
    if (!aiPaths.has(targetPath)) {
      sendJson(response, 404, { detail: "This AI endpoint is not enabled in the temporary demo." });
      return;
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "Authorization, Content-Type",
        "access-control-max-age": "600",
      });
      response.end();
      return;
    }
    if (request.method !== "POST") {
      sendJson(response, 405, { detail: "This AI endpoint only accepts POST requests." });
      return;
    }
    allowInference(request, response);
    return;
  }

  if (pathname.startsWith("/static/uploads/") || pathname.startsWith("/static/processed/")) {
    proxyRequest(request, response, aiOrigin, pathname, { forwardPublicHost: true });
    return;
  }

  if (pathname.startsWith("/uploads/")) {
    proxyRequest(request, response, appOrigin, pathname);
    return;
  }

  const requested = path.resolve(clientDist, `.${pathname}`);
  const safePath = requested.startsWith(clientDist + path.sep) ? requested : path.join(clientDist, "index.html");
  const filePath = fs.existsSync(safePath) && fs.statSync(safePath).isFile()
    ? safePath
    : path.join(clientDist, "index.html");
  if (!fs.existsSync(filePath)) {
    sendJson(response, 503, { message: "BuildTrack demo frontend has not been built." });
    return;
  }
  response.writeHead(200, {
    "content-type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "cache-control": path.basename(filePath) === "index.html" ? "no-store" : "public, max-age=3600",
    "x-content-type-options": "nosniff",
  });
  fs.createReadStream(filePath).pipe(response);
});

gateway.listen(listenPort, "127.0.0.1", () => {
  console.log(`[BuildTrack Public Demo Gateway] Listening on http://127.0.0.1:${listenPort}`);
});
