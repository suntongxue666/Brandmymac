"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

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
  paid: boolean;
  paypalLink: string;
  currentSchedule?: string;
  requestedSchedule?: string;
  startAt: string;
  endAt: string;
  createdAt: string;
};

type SlotPrice = {
  slot_id: string;
  label: string;
  row_type: "hero" | "standard";
  price: number;
  sort_order: number;
};

type RecentVisitor = {
  device_id: string;
  first_seen: number;
  last_seen: number;
  ip: string;
  user_agent: string;
  country: string;
  city: string;
  visits: number;
};

type Traffic = {
  totalVisitors: number;
  online: number;
  recentVisitors: RecentVisitor[];
};

const adminToken = "brandmymac-admin";
const dayOptions = [3, 7];

function toDatetimeLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  if (!value) return "";
  return new Date(value).toISOString();
}

export default function SchedulePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<SlotPrice[]>([]);
  const [traffic, setTraffic] = useState<Traffic | null>(null);
  const [isAllowed, setIsAllowed] = useState(false);
  const [message, setMessage] = useState("");
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({
    productName: "",
    website: "",
    title: "",
    iconPreview: "",
    email: "",
    days: 3,
    startAt: "",
    endAt: "",
  });

  const hasData = useMemo(() => bookings.length > 0 || slots.length > 0, [bookings, slots]);
  const primeSlots = useMemo(
    () => slots.filter((slot) => slot.row_type === "hero"),
    [slots],
  );
  const desktopSlots = useMemo(
    () => slots.filter((slot) => slot.row_type === "standard"),
    [slots],
  );

  function renderPriceControl(slot: SlotPrice) {
    return (
      <label className="price-control" key={slot.slot_id}>
        <span>{slot.label}</span>
        <input
          min="0"
          type="number"
          value={slot.price}
          onChange={(event) =>
            setSlots((current) =>
              current.map((item) =>
                item.slot_id === slot.slot_id
                  ? { ...item, price: Number(event.target.value) }
                  : item,
              ),
            )
          }
          onBlur={(event) =>
            updateSlotPrice(slot.slot_id, Number(event.target.value))
          }
        />
      </label>
    );
  }

  async function loadSchedule() {
    const response = await fetch(`/api/admin/bookings?admin=${adminToken}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      bookings?: Booking[];
      slots?: SlotPrice[];
      traffic?: Traffic;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to load schedule.");
    }

    setBookings(payload.bookings || []);
    setSlots(payload.slots || []);
    setTraffic(payload.traffic || null);
  }

  useEffect(() => {
    let interval: number | undefined;

    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      const allowed = params.get("admin") === adminToken;
      setIsAllowed(allowed);
      if (!allowed) return;

      loadSchedule().catch((error) => {
        setMessage(error instanceof Error ? error.message : "Unable to load schedule.");
      });
      interval = window.setInterval(() => {
        loadSchedule().catch(() => {});
      }, 60000);
    });

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, []);

  async function updateSlotPrice(slotId: string, price: number) {
    setMessage("");
    const response = await fetch(`/api/admin/slots?admin=${adminToken}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, price }),
    });
    const payload = (await response.json()) as {
      bookings?: Booking[];
      slots?: SlotPrice[];
      traffic?: Traffic;
      error?: string;
    };

    if (!response.ok) {
      setMessage(payload.error || "Price update failed.");
      return;
    }

    setBookings(payload.bookings || []);
    setSlots(payload.slots || []);
    setTraffic(payload.traffic || null);
    setMessage("Price updated.");
  }

  async function updateBooking(
    booking: Booking,
    patch: Partial<
      Pick<
        Booking,
        | "paid"
        | "startAt"
        | "endAt"
        | "productName"
        | "website"
        | "title"
        | "iconPreview"
        | "email"
        | "days"
      >
    >,
  ) {
    setMessage("");
    const response = await fetch(`/api/admin/bookings?admin=${adminToken}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: booking.id,
        productName: patch.productName ?? booking.productName,
        website: patch.website ?? booking.website,
        title: patch.title ?? booking.title,
        iconPreview: patch.iconPreview ?? booking.iconPreview,
        email: patch.email ?? booking.email,
        days: patch.days ?? booking.days,
        paid: patch.paid ?? booking.paid,
        startAt: patch.startAt ?? booking.startAt,
        endAt: patch.endAt ?? booking.endAt,
      }),
    });
    const payload = (await response.json()) as {
      bookings?: Booking[];
      slots?: SlotPrice[];
      traffic?: Traffic;
      error?: string;
    };

    if (!response.ok) {
      setMessage(payload.error || "Booking update failed.");
      return false;
    }

    setBookings(payload.bookings || []);
    setSlots(payload.slots || []);
    setTraffic(payload.traffic || null);
    setMessage("Schedule updated.");
    return true;
  }

  function openBookingEditor(booking: Booking) {
    setEditingBooking(booking);
    setMessage("");
    setEditForm({
      productName: booking.productName,
      website: booking.website,
      title: booking.title,
      iconPreview: booking.iconPreview,
      email: booking.email,
      days: booking.days === 7 ? 7 : 3,
      startAt: toDatetimeLocal(booking.startAt),
      endAt: toDatetimeLocal(booking.endAt),
    });
  }

  function handleEditIconUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setEditForm((current) => ({
        ...current,
        iconPreview: String(reader.result),
      }));
    };
    reader.readAsDataURL(file);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingBooking) return;

    const saved = await updateBooking(editingBooking, {
      productName: editForm.productName,
      website: editForm.website,
      title: editForm.title,
      iconPreview: editForm.iconPreview,
      email: editForm.email,
      days: editForm.days,
      startAt: fromDatetimeLocal(editForm.startAt),
      endAt: fromDatetimeLocal(editForm.endAt),
    });
    if (saved) setEditingBooking(null);
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-6 text-[#101010] sm:px-8">
      <section className="mx-auto max-w-6xl">
        <header className="schedule-header">
          <div>
            <p className="eyebrow">Manual approval queue</p>
            <h1>Ad schedule</h1>
          </div>
          <Link className="back-link" href="/">
            Back to screen
          </Link>
        </header>

        {!isAllowed ? (
          <div className="empty-state">
            <h2>Private schedule</h2>
            <p>This page is reserved for BrandMyMac operations.</p>
          </div>
        ) : !hasData ? (
          <div className="empty-state">
            <h2>No bookings yet</h2>
            <p>Submitted placement requests will appear here for payment follow-up.</p>
            {message && <p className="form-error">{message}</p>}
          </div>
        ) : (
          <div className="schedule-stack">
            {message && <p className="admin-message">{message}</p>}

            <section className="traffic-admin">
              <div>
                <span>Total visitors</span>
                <strong>{traffic?.totalVisitors.toLocaleString() || "100"}</strong>
              </div>
              <div>
                <span>Online now</span>
                <strong>{traffic?.online || 2}</strong>
              </div>
              <p>
                New booking requests are saved to D1 and emailed to
                sunwei7482@gmail.com. This page refreshes every 60 seconds.
              </p>
            </section>

            <section className="price-admin">
              <h2>Slot prices</h2>
              <p>
                Existing paid schedules keep their original price. Updated
                prices apply to new booking requests only.
              </p>
              <div className="price-layout">
                <div className="price-grid price-grid-prime">
                  {primeSlots.map(renderPriceControl)}
                </div>
                <div className="price-grid price-grid-desktop">
                  {desktopSlots.slice(0, 6).map(renderPriceControl)}
                </div>
                <div className="price-grid price-grid-desktop">
                  {desktopSlots.slice(6, 12).map(renderPriceControl)}
                </div>
              </div>
            </section>

            <div className="booking-table">
              {bookings.map((booking) => (
                <article className="booking-row" key={booking.id}>
                  <div className="booking-product">
                    {booking.iconPreview ? (
                      <img src={booking.iconPreview} alt="" />
                    ) : (
                      <span>{booking.productName.slice(0, 1)}</span>
                    )}
                    <div>
                      <h2>{booking.productName}</h2>
                      <a href={booking.website} target="_blank">
                        {booking.website}
                      </a>
                      <div className="booking-product-actions">
                        <button
                          className="edit-button"
                          onClick={() => openBookingEditor(booking)}
                          type="button"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <strong>{booking.slotLabel}</strong>
                    <p>{booking.days} days</p>
                    <p>{booking.currentSchedule || booking.requestedSchedule}</p>
                  </div>

                  <div>
                    <strong>${booking.total}</strong>
                    <p>${booking.price}/day</p>
                  </div>

                  <div>
                    <strong>{booking.email}</strong>
                    <p>{new Date(booking.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="booking-copy">
                    <strong>{booking.status}</strong>
                    <p>{booking.title}</p>
                    <small>{booking.paid ? "Payment confirmed" : "Awaiting PayPal"}</small>
                  </div>

                  <div className="admin-controls">
                    <label className="paid-toggle">
                      <input
                        checked={booking.paid}
                        onChange={(event) =>
                          updateBooking(booking, { paid: event.target.checked })
                        }
                        type="checkbox"
                      />
                      <span>Paid</span>
                    </label>
                    <label>
                      Start UTC
                      <input
                        type="datetime-local"
                        defaultValue={toDatetimeLocal(booking.startAt)}
                        onBlur={(event) =>
                          updateBooking(booking, {
                            startAt: fromDatetimeLocal(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      End UTC
                      <input
                        type="datetime-local"
                        defaultValue={toDatetimeLocal(booking.endAt)}
                        onBlur={(event) =>
                          updateBooking(booking, {
                            endAt: fromDatetimeLocal(event.target.value),
                          })
                        }
                      />
                    </label>
                    {booking.paypalLink ? (
                      <a
                        className="paypal-button"
                        href={booking.paypalLink}
                        target="_blank"
                      >
                        Payment link
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            {traffic?.recentVisitors?.length ? (
              <section className="visitor-admin">
                <h2>Recent visitors</h2>
                <div className="visitor-table">
                  {traffic.recentVisitors.map((visitor) => (
                    <article key={visitor.device_id}>
                      <strong>{visitor.ip || "No IP"}</strong>
                      <p>{visitor.user_agent || "No user agent"}</p>
                      <small>
                        {visitor.device_id.slice(0, 8)} · {visitor.country || "Unknown"} ·{" "}
                        {visitor.visits} visits
                      </small>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>

      {editingBooking ? (
        <div className="modal-layer" role="dialog" aria-modal="true">
          <div className="booking-modal">
            <button
              className="close-button"
              onClick={() => setEditingBooking(null)}
              type="button"
              aria-label="Close"
            >
              x
            </button>

            <form className="booking-form" onSubmit={submitEdit}>
              <div>
                <h2>
                  Edit{" "}
                  <span className="slot-name-highlight">
                    {editingBooking.slotLabel}
                  </span>
                </h2>
                <p className="schedule-note">
                  Current schedule:{" "}
                  <span>
                    {editingBooking.currentSchedule ||
                      editingBooking.requestedSchedule}
                  </span>
                </p>
                <p className="price-line">
                  <strong>Price &amp; days:</strong>{" "}
                  <span>
                    ${editingBooking.price}/day, {editForm.days} days, total $
                    {editingBooking.price * editForm.days}
                  </span>
                </p>
              </div>

              <label className="upload-field">
                <span>Product icon</span>
                {editForm.iconPreview ? (
                  <img src={editForm.iconPreview} alt="" />
                ) : (
                  <strong>Upload</strong>
                )}
                <input accept="image/*" onChange={handleEditIconUpload} type="file" />
              </label>

              <div className="form-grid">
                <label>
                  Product name
                  <input
                    required
                    value={editForm.productName}
                    onChange={(event) =>
                      setEditForm({ ...editForm, productName: event.target.value })
                    }
                    placeholder="Your product"
                  />
                </label>
                <label>
                  Product link
                  <input
                    required
                    type="url"
                    value={editForm.website}
                    onChange={(event) =>
                      setEditForm({ ...editForm, website: event.target.value })
                    }
                    placeholder="https://example.com"
                  />
                </label>
              </div>

              <label>
                Page title
                <input
                  required
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm({ ...editForm, title: event.target.value })
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
                        className={editForm.days === days ? "is-selected" : ""}
                        key={days}
                        onClick={() => setEditForm({ ...editForm, days })}
                        type="button"
                      >
                        {days} days
                      </button>
                    ))}
                  </fieldset>
                </div>

                <label>
                  Email
                  <input
                    required
                    type="email"
                    value={editForm.email}
                    onChange={(event) =>
                      setEditForm({ ...editForm, email: event.target.value })
                    }
                    placeholder="your PayPal email"
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Start UTC
                  <input
                    required
                    type="datetime-local"
                    value={editForm.startAt}
                    onChange={(event) =>
                      setEditForm({ ...editForm, startAt: event.target.value })
                    }
                  />
                </label>
                <label>
                  End UTC
                  <input
                    required
                    type="datetime-local"
                    value={editForm.endAt}
                    onChange={(event) =>
                      setEditForm({ ...editForm, endAt: event.target.value })
                    }
                  />
                </label>
              </div>

              <button className="submit-button" type="submit">
                Save
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
