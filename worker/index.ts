/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
  EMAIL?: {
    send(message: {
      to: string | string[];
      from: { email: string; name?: string };
      replyTo?: string;
      subject: string;
      html: string;
      text: string;
    }): Promise<unknown>;
  };
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
const ADMIN_TOKEN = "brandmymac-admin";
const ADMIN_EMAIL = "sunwei7482@gmail.com";
const EMAIL_FROM = "noreply@brandmymac.xyz";
const memoryStats = {
  visits: STARTING_VISITS - 1,
  sessions: new Map<string, number>(),
};

type SlotRow = {
  slot_id: string;
  label: string;
  row_type: "hero" | "standard";
  price: number;
  sort_order: number;
};

type BookingRow = {
  id: string;
  slot_id: string;
  product_name: string;
  website: string;
  title: string;
  icon_preview: string;
  email: string;
  days: number;
  price: number;
  total: number;
  status: BookingStatus;
  paid: number;
  paypal_link: string;
  start_at: string;
  end_at: string;
  requested_schedule: string;
  created_at: string;
  updated_at: string;
};

type BookingStatus = "Pending payment" | "Scheduled" | "Active" | "Ended";

type VisitorInfo = {
  deviceId: string;
  ip: string;
  userAgent: string;
  country: string;
  city: string;
  path: string;
  now: number;
};

type VisitorRow = {
  device_id: string;
  first_seen: number;
  last_seen: number;
  ip: string;
  user_agent: string;
  country: string;
  city: string;
  visits: number;
};

const defaultSlots: SlotRow[] = [
  { slot_id: "top-1", label: "Prime 1", row_type: "hero", price: 75, sort_order: 1 },
  { slot_id: "top-2", label: "Prime 2", row_type: "hero", price: 100, sort_order: 2 },
  { slot_id: "top-3", label: "Prime 3", row_type: "hero", price: 75, sort_order: 3 },
  { slot_id: "desk-1", label: "Desktop 1", row_type: "standard", price: 10, sort_order: 4 },
  { slot_id: "desk-2", label: "Desktop 2", row_type: "standard", price: 10, sort_order: 5 },
  { slot_id: "desk-3", label: "Desktop 3", row_type: "standard", price: 20, sort_order: 6 },
  { slot_id: "desk-4", label: "Desktop 4", row_type: "standard", price: 20, sort_order: 7 },
  { slot_id: "desk-5", label: "Desktop 5", row_type: "standard", price: 10, sort_order: 8 },
  { slot_id: "desk-6", label: "Desktop 6", row_type: "standard", price: 10, sort_order: 9 },
  { slot_id: "desk-7", label: "Desktop 7", row_type: "standard", price: 5, sort_order: 10 },
  { slot_id: "desk-8", label: "Desktop 8", row_type: "standard", price: 5, sort_order: 11 },
  { slot_id: "desk-9", label: "Desktop 9", row_type: "standard", price: 10, sort_order: 12 },
  { slot_id: "desk-10", label: "Desktop 10", row_type: "standard", price: 10, sort_order: 13 },
  { slot_id: "desk-11", label: "Desktop 11", row_type: "standard", price: 5, sort_order: 14 },
  { slot_id: "desk-12", label: "Desktop 12", row_type: "standard", price: 5, sort_order: 15 },
];

const seedBookings = [
  {
    id: "seed-figma-desktop-7",
    slotId: "desk-7",
    productName: "Figma",
    website: "https://figma.com",
    title: "Figma",
    iconPreview: "https://www.google.com/s2/favicons?domain=figma.com&sz=128",
    email: "admin@brandmymac.xyz",
    days: 7,
    price: 5,
    startAt: "2026-08-28T00:00:00.000Z",
    endAt: "2026-09-03T23:59:59.000Z",
  },
  {
    id: "seed-raycast-desktop-10",
    slotId: "desk-10",
    productName: "Raycast",
    website: "https://raycast.com",
    title: "Raycast",
    iconPreview: "https://www.google.com/s2/favicons?domain=raycast.com&sz=128",
    email: "admin@brandmymac.xyz",
    days: 7,
    price: 10,
    startAt: "2026-08-28T00:00:00.000Z",
    endAt: "2026-09-03T23:59:59.000Z",
  },
];

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

function getVisitorInfo(request: Request, now: number): VisitorInfo {
  const url = new URL(request.url);
  const cf = (request as Request & { cf?: { country?: string; city?: string } }).cf;
  const deviceId = readCookie(request, COOKIE_NAME) || crypto.randomUUID();
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ip =
    request.headers.get("cf-connecting-ip") ||
    forwardedFor.split(",")[0]?.trim() ||
    "";

  return {
    deviceId,
    ip,
    userAgent: request.headers.get("user-agent") || "",
    country: request.headers.get("cf-ipcountry") || cf?.country || "",
    city: cf?.city || "",
    path: url.pathname,
    now,
  };
}

function json(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers || {}),
    },
  });
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

async function ensureStatsSchema(db: D1Database) {
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS brandmymac_stats (key TEXT PRIMARY KEY, value INTEGER NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS brandmymac_sessions (id TEXT PRIMARY KEY, updated_at INTEGER NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS brandmymac_visitors (device_id TEXT PRIMARY KEY, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL, ip TEXT NOT NULL, user_agent TEXT NOT NULL, country TEXT NOT NULL, city TEXT NOT NULL, visits INTEGER NOT NULL DEFAULT 1)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS brandmymac_visitor_events (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, ip TEXT NOT NULL, user_agent TEXT NOT NULL, country TEXT NOT NULL, city TEXT NOT NULL, path TEXT NOT NULL, created_at INTEGER NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS brandmymac_visitor_sessions (device_id TEXT PRIMARY KEY, ip TEXT NOT NULL, user_agent TEXT NOT NULL, country TEXT NOT NULL, city TEXT NOT NULL, updated_at INTEGER NOT NULL)",
    ),
  ]);
}

async function getD1Stats(db: D1Database, visitor: VisitorInfo) {
  await ensureStatsSchema(db);

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
    .bind(visitor.deviceId, visitor.now)
    .run();
  await db
    .prepare("DELETE FROM brandmymac_sessions WHERE updated_at < ?")
    .bind(visitor.now - SESSION_WINDOW_MS)
    .run();
  await db
    .prepare(
      "INSERT OR IGNORE INTO brandmymac_visitors (device_id, first_seen, last_seen, ip, user_agent, country, city, visits) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
    )
    .bind(
      visitor.deviceId,
      visitor.now,
      visitor.now,
      visitor.ip,
      visitor.userAgent,
      visitor.country,
      visitor.city,
    )
    .run();
  await db
    .prepare(
      "UPDATE brandmymac_visitors SET last_seen = ?, ip = ?, user_agent = ?, country = ?, city = ?, visits = visits + 1 WHERE device_id = ?",
    )
    .bind(
      visitor.now,
      visitor.ip,
      visitor.userAgent,
      visitor.country,
      visitor.city,
      visitor.deviceId,
    )
    .run();
  await db
    .prepare(
      "INSERT OR REPLACE INTO brandmymac_visitor_sessions (device_id, ip, user_agent, country, city, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      visitor.deviceId,
      visitor.ip,
      visitor.userAgent,
      visitor.country,
      visitor.city,
      visitor.now,
    )
    .run();
  await db
    .prepare("DELETE FROM brandmymac_visitor_sessions WHERE updated_at < ?")
    .bind(visitor.now - SESSION_WINDOW_MS)
    .run();
  await db
    .prepare(
      "INSERT INTO brandmymac_visitor_events (id, device_id, ip, user_agent, country, city, path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      crypto.randomUUID(),
      visitor.deviceId,
      visitor.ip,
      visitor.userAgent,
      visitor.country,
      visitor.city,
      visitor.path,
      visitor.now,
    )
    .run();

  const visitorRow = await db
    .prepare("SELECT COUNT(*) as count FROM brandmymac_visitors")
    .first<{ count: number }>();
  const onlineRow = await db
    .prepare("SELECT COUNT(*) as count FROM brandmymac_visitor_sessions")
    .first<{ count: number }>();

  return {
    visits: Math.max(STARTING_VISITS, (visitorRow?.count ?? 1) + STARTING_VISITS - 1),
    online: onlineRow?.count ?? 2,
  };
}

async function getTrafficSummary(db: D1Database) {
  const now = Date.now();
  await ensureStatsSchema(db);
  await db
    .prepare("DELETE FROM brandmymac_visitor_sessions WHERE updated_at < ?")
    .bind(now - SESSION_WINDOW_MS)
    .run();

  const [visitorTotal, onlineTotal, recentVisitors] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM brandmymac_visitors").first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) as count FROM brandmymac_visitor_sessions")
      .first<{ count: number }>(),
    db
      .prepare(
        "SELECT device_id, first_seen, last_seen, ip, user_agent, country, city, visits FROM brandmymac_visitors ORDER BY last_seen DESC LIMIT 12",
      )
      .all<VisitorRow>(),
  ]);

  return {
    totalVisitors: Math.max(
      STARTING_VISITS,
      (visitorTotal?.count ?? 0) + STARTING_VISITS - 1,
    ),
    online: Math.max(2, onlineTotal?.count ?? 0),
    recentVisitors: recentVisitors.results || [],
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
  const visitor = getVisitorInfo(request, now);
  const stats = env.DB
    ? await getD1Stats(env.DB, visitor)
    : getMemoryStats(visitor.deviceId, now);

  return statsResponse(visitor.deviceId, stats.visits, stats.online);
}

function isAdmin(request: Request) {
  const url = new URL(request.url);
  const headerToken = request.headers.get("x-admin-token");
  return headerToken === ADMIN_TOKEN || url.searchParams.get("admin") === ADMIN_TOKEN;
}

function formatUtcDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function scheduleLabel(startAt: string, endAt: string) {
  return `${formatUtcDate(startAt)} to ${formatUtcDate(endAt)} (UTC)`;
}

function statusForBooking(row: Pick<BookingRow, "paid" | "start_at" | "end_at">): BookingStatus {
  if (!row.paid) return "Pending payment";

  const now = Date.now();
  const start = new Date(row.start_at).getTime();
  const end = new Date(row.end_at).getTime();

  if (Number.isFinite(end) && now > end) return "Ended";
  if (Number.isFinite(start) && now >= start) return "Active";
  return "Scheduled";
}

function slotFromRow(row: SlotRow, booking?: BookingRow) {
  return {
    id: row.slot_id,
    row: row.row_type,
    label: row.label,
    price: row.price,
    product:
      booking && booking.status === "Active"
        ? {
            name: booking.product_name,
            url: booking.website,
            schedule: scheduleLabel(booking.start_at, booking.end_at),
            iconPreview: booking.icon_preview,
            startAt: booking.start_at,
            endAt: booking.end_at,
          }
        : undefined,
    nextSchedule: booking ? scheduleLabel(booking.start_at, booking.end_at) : undefined,
    nextAvailableAt: booking ? booking.end_at : undefined,
  };
}

function bookingFromRow(row: BookingRow) {
  return {
    id: row.id,
    slotId: row.slot_id,
    slotLabel: defaultSlots.find((slot) => slot.slot_id === row.slot_id)?.label || row.slot_id,
    productName: row.product_name,
    website: row.website,
    title: row.title,
    iconPreview: row.icon_preview,
    email: row.email,
    days: row.days,
    price: row.price,
    total: row.total,
    status: row.status,
    paid: Boolean(row.paid),
    paypalLink: row.paypal_link,
    requestedSchedule: row.requested_schedule,
    currentSchedule: scheduleLabel(row.start_at, row.end_at),
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureScheduleSchema(db: D1Database) {
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS brandmymac_slots (slot_id TEXT PRIMARY KEY, label TEXT NOT NULL, row_type TEXT NOT NULL, price INTEGER NOT NULL, sort_order INTEGER NOT NULL)",
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS brandmymac_bookings (id TEXT PRIMARY KEY, slot_id TEXT NOT NULL, product_name TEXT NOT NULL, website TEXT NOT NULL, title TEXT NOT NULL, icon_preview TEXT NOT NULL, email TEXT NOT NULL, days INTEGER NOT NULL, price INTEGER NOT NULL, total INTEGER NOT NULL, status TEXT NOT NULL, paid INTEGER NOT NULL DEFAULT 0, paypal_link TEXT NOT NULL, start_at TEXT NOT NULL, end_at TEXT NOT NULL, requested_schedule TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_brandmymac_bookings_slot_status ON brandmymac_bookings (slot_id, status, start_at, end_at)",
    ),
  ]);

  const slotInsert = db.prepare(
    "INSERT OR IGNORE INTO brandmymac_slots (slot_id, label, row_type, price, sort_order) VALUES (?, ?, ?, ?, ?)",
  );
  const seedSlotUpdates = defaultSlots.map((slot) =>
    slotInsert.bind(slot.slot_id, slot.label, slot.row_type, slot.price, slot.sort_order),
  );
  await db.batch(seedSlotUpdates);

  const bookingInsert = db.prepare(
    "INSERT OR IGNORE INTO brandmymac_bookings (id, slot_id, product_name, website, title, icon_preview, email, days, price, total, status, paid, paypal_link, start_at, end_at, requested_schedule, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const seedBookingUpdates = seedBookings.map((booking) => {
    const status = statusForBooking({
      paid: 1,
      start_at: booking.startAt,
      end_at: booking.endAt,
    });
    const requestedSchedule = scheduleLabel(booking.startAt, booking.endAt);
    const now = new Date().toISOString();
    return bookingInsert.bind(
      booking.id,
      booking.slotId,
      booking.productName,
      booking.website,
      booking.title,
      booking.iconPreview,
      booking.email,
      booking.days,
      booking.price,
      booking.price * booking.days,
      status,
      1,
      "",
      booking.startAt,
      booking.endAt,
      requestedSchedule,
      now,
      now,
    );
  });
  await db.batch(seedBookingUpdates);

  await db.batch([
    db.prepare(
      "UPDATE brandmymac_bookings SET slot_id = 'desk-7', updated_at = ? WHERE product_name = 'Figma' AND website LIKE '%figma%'",
    ).bind(new Date().toISOString()),
    db.prepare(
      "UPDATE brandmymac_bookings SET slot_id = 'desk-10', updated_at = ? WHERE product_name = 'Raycast' AND website LIKE '%raycast%'",
    ).bind(new Date().toISOString()),
  ]);
}

async function refreshBookingStatuses(db: D1Database) {
  const rows = await db
    .prepare("SELECT id, paid, start_at, end_at, status FROM brandmymac_bookings")
    .all<Pick<BookingRow, "id" | "paid" | "start_at" | "end_at" | "status">>();
  const updates = (rows.results || [])
    .map((row) => ({ id: row.id, status: statusForBooking(row) }))
    .filter((row, index) => row.status !== rows.results[index].status)
    .map((row) =>
      db
        .prepare("UPDATE brandmymac_bookings SET status = ?, updated_at = ? WHERE id = ?")
        .bind(row.status, new Date().toISOString(), row.id),
    );

  if (updates.length) {
    await db.batch(updates);
  }
}

function memorySlots() {
  return defaultSlots.map((slot) => {
    const seed = seedBookings.find((booking) => booking.slotId === slot.slot_id);
    return slotFromRow(slot, seed
      ? {
          id: seed.id,
          slot_id: seed.slotId,
          product_name: seed.productName,
          website: seed.website,
          title: seed.title,
          icon_preview: seed.iconPreview,
          email: seed.email,
          days: seed.days,
          price: seed.price,
          total: seed.price * seed.days,
          status: statusForBooking({ paid: 1, start_at: seed.startAt, end_at: seed.endAt }),
          paid: 1,
          paypal_link: "",
          start_at: seed.startAt,
          end_at: seed.endAt,
          requested_schedule: scheduleLabel(seed.startAt, seed.endAt),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : undefined);
  });
}

async function handleSlotsRequest(env: Env) {
  if (!env.DB) return json({ slots: memorySlots(), db: false });

  await ensureScheduleSchema(env.DB);
  await refreshBookingStatuses(env.DB);

  const slots = await env.DB
    .prepare("SELECT slot_id, label, row_type, price, sort_order FROM brandmymac_slots ORDER BY sort_order")
    .all<SlotRow>();
  const liveBookings = await env.DB
    .prepare(
      "SELECT * FROM brandmymac_bookings WHERE status IN ('Active', 'Scheduled') ORDER BY end_at DESC",
    )
    .all<BookingRow>();
  const bookingsBySlot = new Map<string, BookingRow>();
  for (const booking of liveBookings.results || []) {
    if (!bookingsBySlot.has(booking.slot_id)) {
      bookingsBySlot.set(booking.slot_id, booking);
    }
  }

  return json({
    slots: (slots.results || []).map((slot) => slotFromRow(slot, bookingsBySlot.get(slot.slot_id))),
    db: true,
  });
}

async function sendBookingEmail(env: Env, booking: ReturnType<typeof bookingFromRow>) {
  if (!env.EMAIL) return;

  const text = [
    "New BrandMyMac booking request",
    `Slot: ${booking.slotLabel}`,
    `Product: ${booking.productName}`,
    `Website: ${booking.website}`,
    `Email: ${booking.email}`,
    `Days: ${booking.days}`,
    `Price: $${booking.price}/day`,
    `Total: $${booking.total}`,
    `Schedule: ${booking.requestedSchedule}`,
    `PayPal link: ${booking.paypalLink}`,
  ].join("\n");

  await env.EMAIL.send({
    to: ADMIN_EMAIL,
    from: { email: EMAIL_FROM, name: "BrandMyMac" },
    replyTo: booking.email,
    subject: `BrandMyMac booking: ${booking.slotLabel} - ${booking.productName}`,
    html: `<pre>${text.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char] || char)}</pre>`,
    text,
  });
}

async function handleCreateBooking(request: Request, env: Env) {
  if (!env.DB) {
    return json({ error: "D1 database binding DB is required for booking storage." }, { status: 503 });
  }

  await ensureScheduleSchema(env.DB);
  const payload = (await request.json()) as {
    slotId?: string;
    productName?: string;
    website?: string;
    title?: string;
    iconPreview?: string;
    email?: string;
    days?: number;
    requestedSchedule?: string;
    startAt?: string;
    endAt?: string;
  };
  const slotId = payload.slotId || "";
  const days = payload.days === 7 ? 7 : 3;
  const slot = await env.DB
    .prepare("SELECT slot_id, label, row_type, price, sort_order FROM brandmymac_slots WHERE slot_id = ?")
    .bind(slotId)
    .first<SlotRow>();

  if (!slot || !payload.productName || !payload.website || !payload.email) {
    return json({ error: "slotId, productName, website, and email are required." }, { status: 400 });
  }

  const startAt = payload.startAt || new Date().toISOString();
  const end = new Date(startAt);
  end.setUTCDate(end.getUTCDate() + days - 1);
  end.setUTCHours(23, 59, 59, 0);
  const endAt = payload.endAt || end.toISOString();
  const id = crypto.randomUUID();
  const total = slot.price * days;
  const paypalLink = `https://www.paypal.com/paypalme/brandmymac/${total}`;
  const now = new Date().toISOString();
  const requestedSchedule = payload.requestedSchedule || scheduleLabel(startAt, endAt);

  await env.DB
    .prepare(
      "INSERT INTO brandmymac_bookings (id, slot_id, product_name, website, title, icon_preview, email, days, price, total, status, paid, paypal_link, start_at, end_at, requested_schedule, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      slot.slot_id,
      payload.productName,
      payload.website,
      payload.title || payload.productName,
      payload.iconPreview || "",
      payload.email,
      days,
      slot.price,
      total,
      "Pending payment",
      0,
      paypalLink,
      startAt,
      endAt,
      requestedSchedule,
      now,
      now,
    )
    .run();

  const row = await env.DB
    .prepare("SELECT * FROM brandmymac_bookings WHERE id = ?")
    .bind(id)
    .first<BookingRow>();
  const booking = bookingFromRow(row!);

  try {
    await sendBookingEmail(env, booking);
  } catch (error) {
    console.error("Failed to send booking email", error);
  }

  return json({ booking }, { status: 201 });
}

async function handleAdminBookings(request: Request, env: Env) {
  if (!isAdmin(request)) return json({ error: "Unauthorized" }, { status: 401 });
  if (!env.DB) return json({ error: "D1 database binding DB is required." }, { status: 503 });

  await ensureStatsSchema(env.DB);
  await ensureScheduleSchema(env.DB);
  await refreshBookingStatuses(env.DB);

  const [slots, bookings, traffic] = await Promise.all([
    env.DB
      .prepare("SELECT slot_id, label, row_type, price, sort_order FROM brandmymac_slots ORDER BY sort_order")
      .all<SlotRow>(),
    env.DB
      .prepare("SELECT * FROM brandmymac_bookings ORDER BY created_at DESC")
      .all<BookingRow>(),
    getTrafficSummary(env.DB),
  ]);

  return json({
    slots: slots.results || [],
    bookings: (bookings.results || []).map(bookingFromRow),
    traffic,
  });
}

async function handleUpdateSlot(request: Request, env: Env) {
  if (!isAdmin(request)) return json({ error: "Unauthorized" }, { status: 401 });
  if (!env.DB) return json({ error: "D1 database binding DB is required." }, { status: 503 });

  await ensureScheduleSchema(env.DB);
  const payload = (await request.json()) as { slotId?: string; price?: number };
  const price = Number(payload.price);

  if (!payload.slotId || !Number.isFinite(price) || price < 0) {
    return json({ error: "slotId and a non-negative price are required." }, { status: 400 });
  }

  await env.DB
    .prepare("UPDATE brandmymac_slots SET price = ? WHERE slot_id = ?")
    .bind(Math.round(price), payload.slotId)
    .run();

  return handleAdminBookings(request, env);
}

async function handleUpdateBooking(request: Request, env: Env) {
  if (!isAdmin(request)) return json({ error: "Unauthorized" }, { status: 401 });
  if (!env.DB) return json({ error: "D1 database binding DB is required." }, { status: 503 });

  await ensureScheduleSchema(env.DB);
  const payload = (await request.json()) as {
    id?: string;
    paid?: boolean;
    startAt?: string;
    endAt?: string;
    productName?: string;
    website?: string;
    title?: string;
    iconPreview?: string;
    email?: string;
    days?: number;
  };
  const existing = payload.id
    ? await env.DB
        .prepare("SELECT * FROM brandmymac_bookings WHERE id = ?")
        .bind(payload.id)
        .first<BookingRow>()
    : null;

  if (!existing) return json({ error: "Booking not found." }, { status: 404 });

  const startAt = payload.startAt || existing.start_at;
  const endAt = payload.endAt || existing.end_at;
  const days = payload.days === 7 ? 7 : payload.days === 3 ? 3 : existing.days;
  const paid = typeof payload.paid === "boolean" ? (payload.paid ? 1 : 0) : existing.paid;
  const total = existing.price * days;
  const paypalLink = paid
    ? existing.paypal_link
    : `https://www.paypal.com/paypalme/brandmymac/${total}`;
  const status = statusForBooking({ paid, start_at: startAt, end_at: endAt });

  await env.DB
    .prepare(
      "UPDATE brandmymac_bookings SET product_name = ?, website = ?, title = ?, icon_preview = ?, email = ?, days = ?, total = ?, paypal_link = ?, paid = ?, start_at = ?, end_at = ?, requested_schedule = ?, status = ?, updated_at = ? WHERE id = ?",
    )
    .bind(
      payload.productName || existing.product_name,
      payload.website || existing.website,
      payload.title || payload.productName || existing.title,
      typeof payload.iconPreview === "string" ? payload.iconPreview : existing.icon_preview,
      payload.email || existing.email,
      days,
      total,
      paypalLink,
      paid,
      startAt,
      endAt,
      scheduleLabel(startAt, endAt),
      status,
      new Date().toISOString(),
      existing.id,
    )
    .run();

  return handleAdminBookings(request, env);
}

async function runScheduledUpdates(env: Env) {
  if (!env.DB) return;
  await ensureScheduleSchema(env.DB);
  await refreshBookingStatuses(env.DB);
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

    if (url.pathname === "/api/slots") {
      return handleSlotsRequest(env);
    }

    if (url.pathname === "/api/bookings" && request.method === "POST") {
      return handleCreateBooking(request, env);
    }

    if (url.pathname === "/api/admin/slots" && request.method === "PATCH") {
      return handleUpdateSlot(request, env);
    }

    if (url.pathname === "/api/admin/bookings" && request.method === "PATCH") {
      return handleUpdateBooking(request, env);
    }

    if (url.pathname === "/api/admin/bookings") {
      return handleAdminBookings(request, env);
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
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runScheduledUpdates(env);
  },
};

export default worker;
