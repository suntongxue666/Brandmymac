"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";

type Slot = {
  id: string;
  row: "hero" | "standard";
  label: string;
  price: number;
};

type Booking = {
  id: string;
  slotId: string;
  slotLabel: string;
  productName: string;
  website: string;
  title: string;
  description: string;
  keywords: string;
  iconPreview: string;
  email: string;
  days: number;
  price: number;
  total: number;
  status: "Pending payment";
  paypalLink: string;
  createdAt: string;
};

const slots: Slot[] = [
  ...Array.from({ length: 3 }, (_, index) => ({
    id: `top-${index + 1}`,
    row: "hero" as const,
    label: `Prime ${index + 1}`,
    price: 59,
  })),
  ...Array.from({ length: 12 }, (_, index) => ({
    id: `desk-${index + 1}`,
    row: "standard" as const,
    label: `Desktop ${index + 1}`,
    price: 24,
  })),
];

const sampleLogos = [
  { name: "Figma", tone: "#242424", accent: "#ff7262" },
  { name: "Linear", tone: "#1b1f2a", accent: "#5e6ad2" },
  { name: "Raycast", tone: "#251d1d", accent: "#ff6363" },
  { name: "Notion", tone: "#191919", accent: "#f7f4ed" },
  { name: "Stripe", tone: "#252a5f", accent: "#635bff" },
  { name: "Slack", tone: "#241a2f", accent: "#36c5f0" },
  { name: "Framer", tone: "#101010", accent: "#8b5cf6" },
  { name: "Arc", tone: "#14213d", accent: "#fca311" },
  { name: "Loom", tone: "#111827", accent: "#625df5" },
  { name: "Miro", tone: "#2a2200", accent: "#ffd02f" },
  { name: "Cal", tone: "#111111", accent: "#ffffff" },
  { name: "Super", tone: "#102a43", accent: "#38bdf8" },
  { name: "Beehiiv", tone: "#2b1b00", accent: "#f9b233" },
  { name: "Vercel", tone: "#111111", accent: "#f5f5f5" },
  { name: "Tiny", tone: "#153426", accent: "#5ee192" },
];

const dayOptions = [7, 14, 30, 60];

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
      title: `${brand} | Product workspace`,
      description: `${brand} helps Mac users discover a useful product directly from the BrandMyMac screen marketplace.`,
      keywords: `${brand.toLowerCase()}, mac app, startup, productivity`,
    };
  } catch {
    return {
      website: url,
      productName: "",
      title: "",
      description: "",
      keywords: "",
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
    description: "",
    keywords: "",
    email: "",
    days: 14,
    iconPreview: "",
  });
  const [submitted, setSubmitted] = useState<Booking | null>(null);

  const selectedTotal = useMemo(
    () => (activeSlot ? activeSlot.price * form.days : 0),
    [activeSlot, form.days],
  );

  function openSlot(slot: Slot) {
    setActiveSlot(slot);
    setSubmitted(null);
    setForm({
      productName: "",
      website: "",
      title: "",
      description: "",
      keywords: "",
      email: "",
      days: 14,
      iconPreview: "",
    });
  }

  function handleUrlBlur() {
    if (!form.website.trim()) return;
    const meta = inferMetaFromUrl(form.website.trim());
    setForm((current) => ({
      ...current,
      ...meta,
      productName: current.productName || meta.productName,
      title: current.title || meta.title,
      description: current.description || meta.description,
      keywords: current.keywords || meta.keywords,
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

  function submitBooking(event: FormEvent<HTMLFormElement>) {
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
      description: form.description,
      keywords: form.keywords,
      iconPreview: form.iconPreview,
      email: form.email,
      days: form.days,
      price: activeSlot.price,
      total: selectedTotal,
      status: "Pending payment",
      paypalLink,
      createdAt: new Date().toISOString(),
    };

    storeBooking(booking);
    setSubmitted(booking);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f7fb] text-[#101010]">
      <section className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 py-3">
          <Link className="brand-mark" href="/">
            BrandMyMac
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
            <a href="#buy">Buy screen space</a>
            <Link href="/schedule">Schedule</Link>
          </nav>
        </header>

        <div className="intro-grid">
          <div>
            <p className="eyebrow">Screen ads for Mac-native products</p>
            <h1>Own a spot on the most watched desktop.</h1>
          </div>
          <p className="lead">
            BrandMyMac sells clickable ad slots inside a Mac screen layout.
            Choose a region, upload your product icon, add your link, and the
            booking lands in the schedule for manual payment approval.
          </p>
        </div>

        <section id="buy" className="mac-stage" aria-label="BrandMyMac slots">
          <img
            className="mac-shell"
            src="/brandmymac_2560w.png"
            alt="MacBook screen with desktop wallpaper"
          />
          <div className="screen-overlay" aria-label="Available ad regions">
            <div className="slot-row slot-row-prime">
              {slots.slice(0, 3).map((slot, index) => (
                <button
                  className="ad-slot ad-slot-prime"
                  key={slot.id}
                  onClick={() => openSlot(slot)}
                  type="button"
                >
                  <span
                    className="demo-icon demo-icon-large"
                    style={{
                      background: sampleLogos[index].tone,
                      color: sampleLogos[index].accent,
                    }}
                  >
                    {sampleLogos[index].name.slice(0, 1)}
                  </span>
                  <span>{slot.label}</span>
                  <strong>${slot.price}/day</strong>
                </button>
              ))}
            </div>

            <div className="slot-row slot-row-six">
              {slots.slice(3, 9).map((slot, index) => (
                <button
                  className="ad-slot"
                  key={slot.id}
                  onClick={() => openSlot(slot)}
                  type="button"
                >
                  <span
                    className="demo-icon"
                    style={{
                      background: sampleLogos[index + 3].tone,
                      color: sampleLogos[index + 3].accent,
                    }}
                  >
                    {sampleLogos[index + 3].name.slice(0, 1)}
                  </span>
                  <span>{slot.label}</span>
                  <strong>${slot.price}/day</strong>
                </button>
              ))}
            </div>

            <div className="slot-row slot-row-six">
              {slots.slice(9, 15).map((slot, index) => (
                <button
                  className="ad-slot"
                  key={slot.id}
                  onClick={() => openSlot(slot)}
                  type="button"
                >
                  <span
                    className="demo-icon"
                    style={{
                      background: sampleLogos[index + 9].tone,
                      color: sampleLogos[index + 9].accent,
                    }}
                  >
                    {sampleLogos[index + 9].name.slice(0, 1)}
                  </span>
                  <span>{slot.label}</span>
                  <strong>${slot.price}/day</strong>
                </button>
              ))}
            </div>
          </div>
        </section>
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
                  A PayPal request can be sent to {submitted.email}. Once paid,
                  turn the ad on for the reserved dates.
                </p>
                <a href={submitted.paypalLink} target="_blank">
                  Open PayPal link
                </a>
                <Link href="/schedule">View schedule page</Link>
              </div>
            ) : (
              <form className="booking-form" onSubmit={submitBooking}>
                <div>
                  <p className="eyebrow">{activeSlot.label}</p>
                  <h2>Reserve this screen region</h2>
                  <p className="price-line">
                    ${activeSlot.price}/day, {form.days} days, total $
                    {selectedTotal}
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

                <label>
                  Description
                  <textarea
                    required
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                    placeholder="Auto-filled from link"
                  />
                </label>

                <label>
                  Keywords
                  <input
                    value={form.keywords}
                    onChange={(event) =>
                      setForm({ ...form, keywords: event.target.value })
                    }
                    placeholder="Auto-filled from link"
                  />
                </label>

                <div className="form-grid">
                  <label>
                    Days
                    <select
                      value={form.days}
                      onChange={(event) =>
                        setForm({ ...form, days: Number(event.target.value) })
                      }
                    >
                      {dayOptions.map((days) => (
                        <option key={days} value={days}>
                          {days} days
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Email
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm({ ...form, email: event.target.value })
                      }
                      placeholder="you@company.com"
                    />
                  </label>
                </div>

                <button className="submit-button" type="submit">
                  Submit booking
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
