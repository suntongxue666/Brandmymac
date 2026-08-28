"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

const adminToken = "brandmymac-admin";

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
  const [isAllowed, setIsAllowed] = useState(false);
  const [message, setMessage] = useState("");

  const hasData = useMemo(() => bookings.length > 0 || slots.length > 0, [bookings, slots]);

  async function loadSchedule() {
    const response = await fetch(`/api/admin/bookings?admin=${adminToken}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      bookings?: Booking[];
      slots?: SlotPrice[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to load schedule.");
    }

    setBookings(payload.bookings || []);
    setSlots(payload.slots || []);
  }

  useEffect(() => {
    queueMicrotask(() => {
      const params = new URLSearchParams(window.location.search);
      const allowed = params.get("admin") === adminToken;
      setIsAllowed(allowed);
      if (!allowed) return;

      loadSchedule().catch((error) => {
        setMessage(error instanceof Error ? error.message : "Unable to load schedule.");
      });
    });
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
      error?: string;
    };

    if (!response.ok) {
      setMessage(payload.error || "Price update failed.");
      return;
    }

    setBookings(payload.bookings || []);
    setSlots(payload.slots || []);
    setMessage("Price updated.");
  }

  async function updateBooking(
    booking: Booking,
    patch: Partial<Pick<Booking, "paid" | "startAt" | "endAt">>,
  ) {
    setMessage("");
    const response = await fetch(`/api/admin/bookings?admin=${adminToken}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: booking.id,
        paid: patch.paid ?? booking.paid,
        startAt: patch.startAt ?? booking.startAt,
        endAt: patch.endAt ?? booking.endAt,
      }),
    });
    const payload = (await response.json()) as {
      bookings?: Booking[];
      slots?: SlotPrice[];
      error?: string;
    };

    if (!response.ok) {
      setMessage(payload.error || "Booking update failed.");
      return;
    }

    setBookings(payload.bookings || []);
    setSlots(payload.slots || []);
    setMessage("Schedule updated.");
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

            <section className="price-admin">
              <h2>Slot prices</h2>
              <div className="price-grid">
                {slots.map((slot) => (
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
                ))}
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
                    <a className="paypal-button" href={booking.paypalLink} target="_blank">
                      PayPal
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
