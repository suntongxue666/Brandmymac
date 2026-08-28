/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const STARTING_VISITS = 100;
const SESSION_WINDOW_MS = 5 * 60 * 1000;
const COOKIE_NAME = "bmm_session";
const memoryStats = {
  visits: STARTING_VISITS - 1,
  sessions: new Map<string, number>(),
};

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
}

function cleanupSessions(sessions: Map<string, number>, now: number) {
  for (const [id, updatedAt] of sessions) {
    if (now - updatedAt > SESSION_WINDOW_MS) {
      sessions.delete(id);
    }
  }
}

function statsResponse(sessionId: string, visits: number, online: number) {
  return Response.json(
    {
      online: Math.max(2, online),
      visits: Math.max(STARTING_VISITS, visits),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": `${COOKIE_NAME}=${encodeURIComponent(
          sessionId,
        )}; Path=/; Max-Age=2592000; SameSite=Lax`,
      },
    },
  );
}

async function getD1Stats(db: D1Database, sessionId: string, now: number) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS brandmymac_stats (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS brandmymac_sessions (
      id TEXT PRIMARY KEY,
      updated_at INTEGER NOT NULL
    );
  `);

  await db
    .prepare(
      "INSERT OR IGNORE INTO brandmymac_stats (key, value) VALUES ('visits', ?)",
    )
    .bind(STARTING_VISITS - 1)
    .run();
  await db
    .prepare("UPDATE brandmymac_stats SET value = value + 1 WHERE key = 'visits'")
    .run();
  await db
    .prepare(
      "INSERT OR REPLACE INTO brandmymac_sessions (id, updated_at) VALUES (?, ?)",
    )
    .bind(sessionId, now)
    .run();
  await db
    .prepare("DELETE FROM brandmymac_sessions WHERE updated_at < ?")
    .bind(now - SESSION_WINDOW_MS)
    .run();

  const visitRow = await db
    .prepare("SELECT value FROM brandmymac_stats WHERE key = 'visits'")
    .first<{ value: number }>();
  const onlineRow = await db
    .prepare("SELECT COUNT(*) as count FROM brandmymac_sessions")
    .first<{ count: number }>();

  return {
    visits: visitRow?.value ?? STARTING_VISITS,
    online: onlineRow?.count ?? 2,
  };
}

function getMemoryStats(sessionId: string, now: number) {
  memoryStats.visits += 1;
  memoryStats.sessions.set(sessionId, now);
  cleanupSessions(memoryStats.sessions, now);

  return {
    visits: memoryStats.visits,
    online: memoryStats.sessions.size,
  };
}

async function handleStatsRequest(request: Request, env: Env) {
  const now = Date.now();
  const sessionId = readCookie(request, COOKIE_NAME) || crypto.randomUUID();
  const stats = env.DB
    ? await getD1Stats(env.DB, sessionId, now)
    : getMemoryStats(sessionId, now);

  return statsResponse(sessionId, stats.visits, stats.online);
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/stats") {
      return handleStatsRequest(request, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
