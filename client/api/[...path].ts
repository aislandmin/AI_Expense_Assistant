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

declare const process: {
  env: {
    API_URL?: string;
    VITE_API_URL?: string;
  };
};

type VercelRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  on: (event: string, callback: (chunk?: Uint8Array) => void) => void;
};

type VercelResponse = {
  statusCode: number;
  setHeader: (key: string, value: string | string[]) => void;
  end: (body?: Uint8Array | string) => void;
};

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

function getForwardedHeaders(req: VercelRequest) {
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

function readBody(req: VercelRequest) {
  if (req.method === "GET" || req.method === "HEAD") {
    return Promise.resolve(undefined);
  }

  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    req.on("data", (chunk) => {
      if (chunk) {
        chunks.push(chunk);
      }
    });
    req.on("end", () => resolve(concatChunks(chunks)));
    req.on("error", () => reject(new Error("Unable to read request body")));
  });
}

function concatChunks(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const body = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }

  return body;
}

function setResponseHeaders(source: Response, res: VercelResponse) {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const targetUrl = `${getBackendUrl()}/api${getProxiedPath(req.url)}`;
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: getForwardedHeaders(req),
      body: await readBody(req),
    });

    res.statusCode = response.status;
    setResponseHeaders(response, res);
    res.end(new Uint8Array(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.statusCode = 502;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "API proxy request failed" }));
  }
}
