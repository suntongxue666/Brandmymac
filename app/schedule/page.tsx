"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Booking = {
  id: string;
  slotLabel: string;
  productName: string;
  website: string;
  title: string;
  iconPreview: string;
  email: string;
  days: number;
  price: number;
  total: number;
  status: "Active" | "Pending payment";
  paypalLink: string;
  currentSchedule?: string;
  requestedSchedule?: string;
  createdAt: string;
};

const defaultBookings: Booking[] = [
  {
    id: "seed-prime-1",
    slotLabel: "Prime 1",
    productName: "Figma",
    website: "https://figma.com",
    title: "Figma",
    iconPreview: "https://www.google.com/s2/favicons?domain=figma.com&sz=128",
    email: "admin@brandmymac.lol",
    days: 7,
    price: 75,
    total: 525,
    status: "Active",
    paypalLink: "",
    currentSchedule: "Aug 28, 2026 to Sep 3, 2026 (UTC)",
    requestedSchedule: "Aug 28, 2026 to Sep 3, 2026 (UTC)",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-prime-3",
    slotLabel: "Prime 3",
    productName: "Raycast",
    website: "https://raycast.com",
    title: "Raycast",
    iconPreview: "https://www.google.com/s2/favicons?domain=raycast.com&sz=128",
    email: "admin@brandmymac.lol",
    days: 7,
    price: 75,
    total: 525,
    status: "Active",
    paypalLink: "",
    currentSchedule: "Aug 28, 2026 to Sep 3, 2026 (UTC)",
    requestedSchedule: "Aug 28, 2026 to Sep 3, 2026 (UTC)",
    createdAt: new Date().toISOString(),
  },
];

export default function SchedulePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const adminToken = params.get("admin");
    const allowed = adminToken === "brandmymac-admin";
    setIsAllowed(allowed);
    if (!allowed) return;

    const stored = window.localStorage.getItem("brandmymac-bookings");
    setBookings([...defaultBookings, ...(stored ? JSON.parse(stored) : [])]);
  }, []);

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
        ) : bookings.length === 0 ? (
          <div className="empty-state">
            <h2>No bookings yet</h2>
            <p>Submitted placement requests will appear here for payment follow-up.</p>
          </div>
        ) : (
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
                  <p>{booking.requestedSchedule || booking.currentSchedule}</p>
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
                  {booking.currentSchedule && (
                    <small>Current: {booking.currentSchedule}</small>
                  )}
                </div>

                <a className="paypal-button" href={booking.paypalLink} target="_blank">
                  PayPal
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
