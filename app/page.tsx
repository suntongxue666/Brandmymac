"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

const macImageUrl =
  "https://pub-76f2f1fc81ef48fbb698a2518f11013d.r2.dev/brandmymac_2560w-2.png";

type Slot = {
  id: string;
  row: "hero" | "standard";
  label: string;
  price: number;
  nextSchedule?: string;
  nextAvailableAt?: string;
  product?: {
    name: string;
    url: string;
    schedule: string;
    iconPreview?: string;
    startAt?: string;
    endAt?: string;
  };
};

type Booking = {
  id: string;
  slotId: string;
  slotLabel: string;
  productName: string;
  website: string;
  title: string;
  iconPreview: string;
  email: string;
  days: number;
  price: number;
  total: number;
  status: "Pending payment" | "Scheduled" | "Active" | "Ended";
  paid?: boolean;
  paypalLink: string;
  currentSchedule: string;
  requestedSchedule: string;
  startAt?: string;
  endAt?: string;
  createdAt: string;
};

const initialSlots: Slot[] = [
  { id: "top-1", row: "hero", label: "Prime 1", price: 75 },
  { id: "top-2", row: "hero", label: "Prime 2", price: 100 },
  { id: "top-3", row: "hero", label: "Prime 3", price: 75 },
  { id: "desk-1", row: "standard", label: "Desktop 1", price: 10 },
  { id: "desk-2", row: "standard", label: "Desktop 2", price: 10 },
  { id: "desk-3", row: "standard", label: "Desktop 3", price: 20 },
  { id: "desk-4", row: "standard", label: "Desktop 4", price: 20 },
  { id: "desk-5", row: "standard", label: "Desktop 5", price: 10 },
  { id: "desk-6", row: "standard", label: "Desktop 6", price: 10 },
  {
    id: "desk-7",
    row: "standard",
    label: "Desktop 7",
    price: 5,
    product: {
      name: "Figma",
      url: "https://figma.com",
      schedule: "Aug 28, 2026 to Sep 3, 2026 (UTC)",
      iconPreview: "https://www.google.com/s2/favicons?domain=figma.com&sz=128",
      startAt: "2026-08-28T00:00:00.000Z",
      endAt: "2026-09-03T23:59:59.000Z",
    },
  },
  { id: "desk-8", row: "standard", label: "Desktop 8", price: 5 },
  { id: "desk-9", row: "standard", label: "Desktop 9", price: 10 },
  {
    id: "desk-10",
    row: "standard",
    label: "Desktop 10",
    price: 10,
    product: {
      name: "Raycast",
      url: "https://raycast.com",
      schedule: "Aug 28, 2026 to Sep 3, 2026 (UTC)",
      iconPreview: "https://www.google.com/s2/favicons?domain=raycast.com&sz=128",
      startAt: "2026-08-28T00:00:00.000Z",
      endAt: "2026-09-03T23:59:59.000Z",
    },
  },
  { id: "desk-11", row: "standard", label: "Desktop 11", price: 5 },
  { id: "desk-12", row: "standard", label: "Desktop 12", price: 5 },
];

const dayOptions = [3, 7];

function faviconUrl(url: string) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return "";
  }
}

function formatUtcDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function startOfUtcDay(date: Date) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function inferMetaFromUrl(url: string) {
  const normalized = url.startsWith("http") ? url : `https://${url}`;

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, "");
    const brand = host
      .split(".")[0]
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    return {
      website: parsed.toString(),
      productName: brand,
      title: brand,
    };
  } catch {
    return {
      website: url,
      productName: "",
      title: "",
    };
  }
}

function storeBooking(booking: Booking) {
  const current = JSON.parse(
    window.localStorage.getItem("brandmymac-bookings") || "[]",
  ) as Booking[];
  window.localStorage.setItem(
    "brandmymac-bookings",
    JSON.stringify([booking, ...current]),
  );
}

export default function Home() {
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({
    productName: "",
    website: "",
    title: "",
    email: "",
    days: 3,
    iconPreview: "",
  });
  const [submitted, setSubmitted] = useState<Booking | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [submitError, setSubmitError] = useState("");
  const [visitorStats, setVisitorStats] = useState({
    online: 2,
    visits: 100,
  });

  const selectedTotal = useMemo(
    () => (activeSlot ? activeSlot.price * form.days : 0),
    [activeSlot, form.days],
  );
  const activeSchedule =
    activeSlot?.product?.schedule ||
    (activeSlot?.nextSchedule ? `Reserved: ${activeSlot.nextSchedule}` : "Available now");
  const reservationStart = useMemo(() => {
    const now = startOfUtcDay(new Date());
    const blockedUntil = activeSlot?.nextAvailableAt || activeSlot?.product?.endAt;
    if (!blockedUntil) return now;

    const next = new Date(blockedUntil);
    if (Number.isNaN(next.getTime())) return now;
    next.setUTCDate(next.getUTCDate() + 1);
    return startOfUtcDay(next);
  }, [activeSlot]);
  const reservationWindow = useMemo(() => {
    const start = reservationStart;
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + form.days - 1);
    end.setUTCHours(23, 59, 59, 0);

    return `${formatUtcDate(start)} to ${formatUtcDate(end)}, UTC calendar days.`;
  }, [form.days, reservationStart]);

  useEffect(() => {
    let cancelled = false;

    function loadSlots() {
      fetch("/api/slots", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { slots?: Slot[] } | null) => {
          if (cancelled || !payload?.slots?.length) return;
          setSlots(payload.slots);
        })
        .catch(() => {});
    }

    function loadStats() {
      fetch("/api/stats", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((stats: { online?: number; visits?: number } | null) => {
          if (cancelled || !stats) return;
          setVisitorStats({
            online: Math.max(2, Number(stats.online) || 2),
            visits: Math.max(100, Number(stats.visits) || 100),
          });
        })
        .catch(() => {
          if (cancelled) return;
          setVisitorStats({ online: 2, visits: 100 });
        });
    }

    loadSlots();
    loadStats();
    const slotsInterval = window.setInterval(loadSlots, 60000);
    const statsInterval = window.setInterval(loadStats, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(slotsInterval);
      window.clearInterval(statsInterval);
    };
  }, []);

  function openSlot(slot: Slot) {
    setActiveSlot(slot);
    setSubmitted(null);
    setSubmitError("");
    setForm({
      productName: "",
      website: "",
      title: "",
      email: "",
      days: 3,
      iconPreview: "",
    });
  }

  function handleSlotClick(slot: Slot) {
    if (slot.product) {
      window.open(slot.product.url, "_blank", "noopener,noreferrer");
      return;
    }

    openSlot(slot);
  }

  function getSlotMessage(slot: Slot) {
    if (slot.product) {
      return `> ${slot.label}: $${slot.price}/day | current: ${slot.product.schedule} | reserve next dates`;
    }

    return `> ${slot.label}: $${slot.price}/day | available now | reserve 3 or 7 days`;
  }

  function renderSlot(slot: Slot, size: "prime" | "standard") {
    const isPrime = size === "prime";

    return (
      <div
        className={`slot-cell ${isPrime ? "slot-cell-prime" : ""}`}
        key={slot.id}
        onMouseEnter={() => setHoveredSlot(slot)}
        onMouseLeave={() => setHoveredSlot(null)}
      >
        <button
          className={`ad-slot ${isPrime ? "ad-slot-prime" : ""} ${
            slot.product ? "is-live" : "is-empty"
          }`}
          onClick={() => handleSlotClick(slot)}
          type="button"
        >
          <span className={`demo-icon ${isPrime ? "demo-icon-large" : ""}`}>
            {slot.product ? (
              <img
                src={slot.product.iconPreview || faviconUrl(slot.product.url)}
                alt=""
              />
            ) : (
              <strong className="slot-price">${slot.price}/day</strong>
            )}
          </span>
          <span>{slot.product?.name || slot.label}</span>
        </button>
        <button
          className="reserve-badge"
          onClick={(event) => {
            event.stopPropagation();
            openSlot(slot);
          }}
          type="button"
        >
          Reserve
        </button>
      </div>
    );
  }

  function handleUrlBlur() {
    if (!form.website.trim()) return;
    const meta = inferMetaFromUrl(form.website.trim());
    setForm((current) => ({
      ...current,
      ...meta,
      productName: current.productName || meta.productName,
      title: current.title || meta.title,
    }));
  }

  function handleIconUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        iconPreview: String(reader.result),
      }));
    };
    reader.readAsDataURL(file);
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSlot) return;

    const paypalLink = `https://www.paypal.com/paypalme/brandmymac/${selectedTotal}`;
    const booking: Booking = {
      id: crypto.randomUUID(),
      slotId: activeSlot.id,
      slotLabel: activeSlot.label,
      productName: form.productName,
      website: form.website,
      title: form.title,
      iconPreview: form.iconPreview,
      email: form.email,
      days: form.days,
      price: activeSlot.price,
      total: selectedTotal,
      status: "Pending payment",
      paypalLink,
      currentSchedule: activeSchedule,
      requestedSchedule: reservationWindow,
      startAt: reservationStart.toISOString(),
      createdAt: new Date().toISOString(),
    };

    setSubmitError("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: booking.slotId,
          productName: booking.productName,
          website: booking.website,
          title: booking.title,
          iconPreview: booking.iconPreview,
          email: booking.email,
          days: booking.days,
          requestedSchedule: booking.requestedSchedule,
          startAt: reservationStart.toISOString(),
        }),
      });
      const payload = (await response.json()) as {
        booking?: Booking;
        error?: string;
      };

      if (!response.ok || !payload.booking) {
        throw new Error(payload.error || "Booking could not be submitted.");
      }

      storeBooking(payload.booking);
      setSubmitted(payload.booking);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Booking failed.");
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f7fb] text-[#101010]">
      <section className="hero-section mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 pb-5 pt-20 sm:px-8 lg:px-10">
        <header className="site-header">
          <Link className="brand-mark" href="/">
            <span className="brand-device">
              <img src={macImageUrl} alt="" />
            </span>
            BrandMyMac
          </Link>
          <nav className="main-nav" aria-label="Primary navigation">
            <a href="#buy">Buy screen space</a>
            <a href="#how-it-works">How it works</a>
            <a href="#the-machine">The machine</a>
            <a href="#faq">FAQ</a>
          </nav>
        </header>

        <div className="hero-copy">
          <div className="live-stats" aria-label="Site activity">
            <span>
              <i aria-hidden="true" />
              <strong>{visitorStats.online}</strong> people visiting this site now
            </span>
            <span>
              <strong>{visitorStats.visits.toLocaleString()}</strong> Visitors so far
            </span>
          </div>
          <h1>Your brand, on my Mac Screen</h1>
          <p className="lead">
            Contextual screen ads with fixed daily pricing. Reserve, confirm,
            and go live.
          </p>
        </div>

        <section id="buy" className="mac-stage" aria-label="BrandMyMac slots">
          <img
            className="mac-shell"
            src={macImageUrl}
            alt="MacBook screen with desktop wallpaper"
          />
          <div className="screen-overlay" aria-label="Available ad regions">
            <div className="price-terminal" aria-live="polite">
              {hoveredSlot
                ? getSlotMessage(hoveredSlot)
                : "> hover an empty slot to see placement terms"}
            </div>
            <div className="slot-row slot-row-prime">
              {slots.slice(0, 3).map((slot) => renderSlot(slot, "prime"))}
            </div>

            <div className="slot-row slot-row-six">
              {slots.slice(3, 9).map((slot) => renderSlot(slot, "standard"))}
            </div>

            <div className="slot-row slot-row-six">
              {slots.slice(9, 15).map((slot) => renderSlot(slot, "standard"))}
            </div>
          </div>
        </section>
      </section>

      <section id="how-it-works" className="content-band">
        <div className="content-inner">
          <p className="eyebrow">How it works</p>
          <h2 className="how-heading">
            Pick a screen region. Send your product. I review and switch it on.
          </h2>
          <div className="step-grid">
            <article>
              <strong>1</strong>
              <h3>Choose a placement</h3>
              <p>
                Click any available area on the Mac screen and choose how many
                days you want the product shown.
              </p>
            </article>
            <article>
              <strong>2</strong>
              <h3>Submit product details</h3>
              <p>
                Upload an icon, add your link, and the form prepares a page
                title for review.
              </p>
            </article>
            <article>
              <strong>3</strong>
              <h3>Confirm by PayPal</h3>
              <p>
                I send a PayPal payment link by email. After payment is
                confirmed, your placement goes live on the scheduled dates.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="the-machine" className="content-band machine-band">
        <div className="content-inner machine-layout">
          <div>
            <p className="eyebrow">The machine</p>
            <h2>The M1 Max that carried the work.</h2>
          </div>
          <p>
            This MacBook Pro has been my daily machine for years: product
            launches, late-night builds, client work, experiments that failed,
            and a few that quietly paid the bills. BrandMyMac turns its screen
            into a tiny product wall, one placement at a time. The goal is
            simple: let this machine help fund the next Mac while giving useful
            tools a place people actually look.
          </p>
        </div>
      </section>

      <section id="faq" className="content-band faq-band">
        <div className="content-inner">
          <p className="eyebrow">FAQ</p>
          <div className="faq-list">
            <article>
              <h3>How do I reserve a placement?</h3>
              <p>
                Click a screen region, upload your product icon, add your
                website, choose 3 or 7 continuous days, and submit your email.
              </p>
            </article>
            <article>
              <h3>What details do you need?</h3>
              <p>
                A product name, icon, website link, page title, email, selected
                slot, and selected day package are enough for review.
              </p>
            </article>
            <article>
              <h3>How do payments work?</h3>
              <p>
                After your request is reviewed, I reply by email with a PayPal
                payment link. Please check the inbox for the email you submit.
              </p>
            </article>
            <article>
              <h3>What if payment is late?</h3>
              <p>
                If you reserve 3 days on day 1, pay on day 2, and the placement
                only runs for 2 days, I refund the unused 1 day fee.
              </p>
            </article>
            <article>
              <h3>Can any product be shown?</h3>
              <p>
                I review each request before it goes live. Products need a clear
                website, usable icon, and a fit for the audience.
              </p>
            </article>
            <article>
              <h3>When does a placement start?</h3>
              <p>
                After PayPal payment is confirmed, I switch the placement on for
                the selected number of days.
              </p>
            </article>
            <article>
              <h3>When will you reply?</h3>
              <p>
                Please allow for time zone delays. Normal reply hours are UTC
                00:00-16:00.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="policy-band">
        <div className="policy-inner footer-inner">
          <div>
            <p className="eyebrow">Legal</p>
            <h2>BrandMyMac</h2>
            <p>
              Fixed daily Mac screen placements for reviewed products. Read the
              terms and privacy policy before submitting a request.
            </p>
          </div>
          <footer className="contact-footer">
            <a href="mailto:tiktreeapp@gmail.com">tiktreeapp@gmail.com</a>
            <a
              className="x-link"
              href="https://x.com/weisun29255385"
              target="_blank"
            >
              X @weisun29255385
            </a>
          </footer>
          <div className="footer-bottom">
            <p className="copyright">
              © 2026 BrandMyMac.xyz. All rights reserved.
            </p>
            <nav className="legal-links" aria-label="Legal links">
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </nav>
          </div>
          <p className="apple-disclaimer">
            BrandMyMac.xyz is not affiliated with, endorsed by, or sponsored by
            Apple Inc. MacBook Pro and Mac are trademarks of Apple Inc.
          </p>
        </div>
      </section>

      {activeSlot && (
        <div className="modal-layer" role="dialog" aria-modal="true">
          <div className="booking-modal">
            <button
              className="close-button"
              onClick={() => setActiveSlot(null)}
              type="button"
              aria-label="Close"
            >
              x
            </button>

            {submitted ? (
              <div className="success-panel">
                <p className="eyebrow">Submitted</p>
                <h2>{submitted.productName} is in the schedule.</h2>
                <p>
                  A PayPal Payment request will be sent to {submitted.email} by
                  the Admin. Once paid, the ad will be turned on for the
                  reserved dates.
                </p>
                <p>
                  The payment link may be delayed because of time zone
                  differences. Admin working hours are 00:00-16:00 UTC.
                </p>
                <button onClick={() => setActiveSlot(null)} type="button">
                  I understand
                </button>
                <Link href="/schedule">View schedule page</Link>
              </div>
            ) : (
              <form className="booking-form" onSubmit={submitBooking}>
                <div>
                  <h2>
                    Reserve{" "}
                    <span className="slot-name-highlight">{activeSlot.label}</span>
                  </h2>
                  <p className="schedule-note">
                    Current schedule: <span>{activeSchedule}</span>
                  </p>
                  <p className="price-line">
                    <strong>Price &amp; days:</strong>{" "}
                    <span>
                      ${activeSlot.price}/day, {form.days} days, total $
                      {selectedTotal}
                    </span>
                  </p>
                </div>

                <label className="upload-field">
                  <span>Product icon</span>
                  {form.iconPreview ? (
                    <img src={form.iconPreview} alt="" />
                  ) : (
                    <strong>Upload</strong>
                  )}
                  <input accept="image/*" onChange={handleIconUpload} type="file" />
                </label>

                <div className="form-grid">
                  <label>
                    Product name
                    <input
                      required
                      value={form.productName}
                      onChange={(event) =>
                        setForm({ ...form, productName: event.target.value })
                      }
                      placeholder="Your product"
                    />
                  </label>
                  <label>
                    Product link
                    <input
                      required
                      type="url"
                      value={form.website}
                      onBlur={handleUrlBlur}
                      onChange={(event) =>
                        setForm({ ...form, website: event.target.value })
                      }
                      placeholder="https://example.com"
                    />
                  </label>
                </div>

                <label>
                  Page title
                  <input
                    required
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    placeholder="Auto-filled from link"
                  />
                </label>

                <div className="booking-row-fields">
                  <div>
                    <fieldset className="day-picker">
                      <legend>Days</legend>
                      {dayOptions.map((days) => (
                        <button
                          className={form.days === days ? "is-selected" : ""}
                          key={days}
                          onClick={() => setForm({ ...form, days })}
                          type="button"
                        >
                          {days} days
                        </button>
                      ))}
                    </fieldset>
                    <p className="date-note">{reservationWindow}</p>
                  </div>

                  <label>
                    Email
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm({ ...form, email: event.target.value })
                      }
                      placeholder="your PayPal email"
                    />
                  </label>
                </div>

                <div className="tips-box">
                  <strong>Tips</strong>
                  <p>
                    Placement dates must run continuously for 3 or 7 days.
                    Custom day selection is not supported.
                  </p>
                  <p>
                    After receiving your request, we reply with a PayPal
                    payment link. Please leave your PayPal email first.
                  </p>
                </div>

                <button className="submit-button" type="submit">
                  Submit booking
                </button>
                {submitError && <p className="form-error">{submitError}</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
