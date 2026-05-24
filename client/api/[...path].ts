import type { IncomingMessage, ServerResponse } from "node:http";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function getBackendUrl() {
  const url = process.env.API_URL ?? process.env.VITE_API_URL;

  if (!url) {
    throw new Error("API_URL is required for the Vercel API proxy");
  }

  return url.replace(/\/$/, "");
}

function getProxiedPath(requestUrl: string | undefined) {
  const url = new URL(requestUrl ?? "/api", "https://local.proxy");
  const path = url.pathname.replace(/^\/api/, "") || "/";

  return `${path}${url.search}`;
}

function getForwardedHeaders(req: IncomingMessage) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    const lowerKey = key.toLowerCase();

    if (!value || HOP_BY_HOP_HEADERS.has(lowerKey)) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else {
      headers.set(key, value);
    }
  }

  return headers;
}

function readBody(req: IncomingMessage) {
  if (req.method === "GET" || req.method === "HEAD") {
    return Promise.resolve(undefined);
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function setResponseHeaders(source: Response, res: ServerResponse) {
  source.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase()) && key !== "set-cookie") {
      res.setHeader(key, value);
    }
  });

  const cookieHeaders = (
    source.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie?.();

  if (cookieHeaders?.length) {
    res.setHeader("set-cookie", cookieHeaders);
    return;
  }

  const cookieHeader = source.headers.get("set-cookie");

  if (cookieHeader) {
    res.setHeader("set-cookie", cookieHeader);
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  try {
    const targetUrl = `${getBackendUrl()}/api${getProxiedPath(req.url)}`;
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: getForwardedHeaders(req),
      body: await readBody(req),
    });

    res.statusCode = response.status;
    setResponseHeaders(response, res);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.statusCode = 502;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "API proxy request failed" }));
  }
}
