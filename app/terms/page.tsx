import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link className="back-link" href="/">
          Back to BrandMyMac
        </Link>
        <p className="eyebrow">Terms</p>
        <h1>User Service Agreement</h1>
        <section className="legal-section">
          <p>
            BrandMyMac provides fixed daily screen placements for reviewed
            products. Submitting a request does not guarantee publication. Each
            request is reviewed for fit, accuracy, availability, and basic
            safety before a PayPal payment link is sent.
          </p>
          <p>
            A placement starts only after payment is confirmed. Selected
            packages must run continuously for 3 or 7 days and cannot be
            customized through the public form.
          </p>
          <p>
            If a confirmed placement cannot run for the paid number of days, the
            unused daily fee will be refunded. For example, if a 3-day placement
            is requested on day 1, paid on day 2, and only 2 days are published,
            the unused 1-day fee will be refunded.
          </p>
          <p>
            BrandMyMac may decline, pause, or remove a placement that is
            misleading, harmful, illegal, unavailable, infringes third-party
            rights, or materially differs from the submitted product.
          </p>
          <p>
            Please watch the email address you submit. Replies may be delayed by
            time zone differences. Normal working hours are UTC 00:00-16:00.
          </p>
        </section>
        <footer className="legal-footer">
          <a href="mailto:tiktreeapp@gmail.com">tiktreeapp@gmail.com</a>
          <a
            className="x-link"
            href="https://x.com/weisun29255385"
            target="_blank"
          >
            X @weisun29255385
          </a>
        </footer>
      </div>
    </main>
  );
}
