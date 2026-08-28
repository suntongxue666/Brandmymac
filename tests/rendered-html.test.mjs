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
  assert.match(html, /Buy clickable ad space inside a Mac screen marketplace/i);
  assert.match(html, /Own a spot on the most watched desktop\./);
  assert.match(html, /src="\/brandmymac_2560w\.png"/);
  assert.match(html, /Prime 1/);
  assert.match(html, /Prime 3/);
  assert.match(html, /Desktop 12/);
  assert.equal((html.match(/class="ad-slot/g) || []).length, 15);
});

test("server-renders the schedule page", async () => {
  const response = await render("/schedule");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Ad schedule/);
  assert.match(html, /Manual approval queue/);
  assert.match(html, /No bookings yet/);
  assert.match(html, /Back to screen/);
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
