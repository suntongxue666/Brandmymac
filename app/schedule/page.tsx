"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Booking = {
  id: string;
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

export default function SchedulePage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("brandmymac-bookings");
    setBookings(stored ? JSON.parse(stored) : []);
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

        {bookings.length === 0 ? (
          <div className="empty-state">
            <h2>No bookings yet</h2>
            <p>Submitted ad requests will appear here for payment follow-up.</p>
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
                  <p>{booking.description}</p>
                  <small>{booking.keywords}</small>
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
