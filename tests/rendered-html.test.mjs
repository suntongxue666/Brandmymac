import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the BrandMyMac screen marketplace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>BrandMyMac<\/title>/i);
  assert.match(html, /Reserve fixed daily placements inside a Mac screen marketplace/i);
  assert.match(html, /Your brand, on my Mac Screen/);
  assert.match(html, /Contextual screen ads with fixed daily pricing/);
  assert.match(
    html,
    /https:\/\/pub-76f2f1fc81ef48fbb698a2518f11013d\.r2\.dev\/brandmymac_2560w-2\.png/,
  );
  assert.match(html, /Figma/);
  assert.match(html, /Raycast/);
  assert.match(html, /Prime 2/);
  assert.match(html, /Desktop 12/);
  assert.match(html, /hover an empty slot to see placement terms/);
  assert.match(html, /Reserve/);
  assert.match(html, /href="\/terms"/);
  assert.match(html, /href="\/privacy"/);
  assert.match(html, /tiktreeapp@gmail\.com/);
  assert.match(html, /G-M0KLSDHYDG/);
  assert.match(html, /© 2026 BrandMyMac\.xyz\. All rights reserved\./);
  assert.match(html, /BrandMyMac\.xyz is not affiliated with/);
  assert.equal((html.match(/class="ad-slot/g) || []).length, 15);
});

test("server-renders dedicated legal pages", async () => {
  const termsResponse = await render("/terms");
  assert.equal(termsResponse.status, 200);
  const termsHtml = await termsResponse.text();
  assert.match(termsHtml, /User Service Agreement/);
  assert.match(termsHtml, /must run continuously for 3 or 7 days/);
  assert.match(termsHtml, /tiktreeapp@gmail\.com/);

  const privacyResponse = await render("/privacy");
  assert.equal(privacyResponse.status, 200);
  const privacyHtml = await privacyResponse.text();
  assert.match(privacyHtml, /User Privacy Policy/);
  assert.match(privacyHtml, /Submitted information is not sold/);
  assert.match(privacyHtml, /device IDs, IP address, user agent/);
});

test("serves visitor stats with sane minimums", async () => {
  const response = await render("/api/stats");
  assert.equal(response.status, 200);

  const stats = await response.json();
  assert.equal(typeof stats.online, "number");
  assert.equal(typeof stats.visits, "number");
  assert.ok(stats.online >= 2);
  assert.ok(stats.visits >= 100);
});

test("serves slot data and protects admin APIs", async () => {
  const slotsResponse = await render("/api/slots");
  assert.equal(slotsResponse.status, 200);
  const slotsPayload = await slotsResponse.json();
  assert.equal(slotsPayload.slots.length, 15);

  const desktop7 = slotsPayload.slots.find(
    (slot) => slot.id === "desk-7",
  );
  const desktop10 = slotsPayload.slots.find(
    (slot) => slot.id === "desk-10",
  );
  assert.equal(desktop7.product.name, "Figma");
  assert.equal(desktop10.product.name, "Raycast");

  const adminResponse = await render("/api/admin/bookings");
  assert.equal(adminResponse.status, 401);
});

test("server-renders the schedule page", async () => {
  const response = await render("/schedule");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Ad schedule/);
  assert.match(html, /Manual approval queue/);
  assert.match(html, /Private schedule/);
  assert.match(html, /reserved for BrandMyMac operations/);
});

test("source wires D1-backed scheduling and admin email", async () => {
  const [hosting, wrangler, viteConfig, worker, page, schedule] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/schedule/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(hosting, /"d1": "DB"/);
  assert.match(wrangler, /"send_email"/);
  assert.match(viteConfig, /BRANDMYMAC_DATABASE_NAME = "brandmymac"/);
  assert.match(viteConfig, /960eb274-0083-4111-b314-d8a12a371d80/);
  assert.match(worker, /sunwei7482@gmail\.com/);
  assert.match(worker, /brandmymac_bookings/);
  assert.match(worker, /brandmymac_visitors/);
  assert.match(worker, /brandmymac_visitor_events/);
  assert.match(worker, /cf-connecting-ip/);
  assert.match(worker, /handleUpdateSlot/);
  assert.match(page, /fetch\("\/api\/bookings"/);
  assert.match(page, /setInterval\(loadStats, 60000\)/);
  assert.match(page, /setInterval\(loadSlots, 60000\)/);
  assert.match(page, /id: "desk-7"[\s\S]*name: "Figma"/);
  assert.match(page, /id: "desk-10"[\s\S]*name: "Raycast"/);
  assert.match(schedule, /Slot prices/);
  assert.match(schedule, /Existing paid schedules keep their original price/);
  assert.match(schedule, /Recent visitors/);
  assert.match(schedule, /Paid/);
  assert.match(schedule, /Start UTC/);
  assert.match(schedule, /End UTC/);
});

test("removes the starter preview surface", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
});
