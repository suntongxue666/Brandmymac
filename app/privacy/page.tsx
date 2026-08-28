import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link className="back-link" href="/">
          Back to BrandMyMac
        </Link>
        <p className="eyebrow">Privacy</p>
        <h1>User Privacy Policy</h1>
        <section className="legal-section">
          <p>
            The booking form collects only the information needed to review and
            manage a placement: product name, website, icon, page title, email,
            selected slot, selected days, requested schedule, payment status,
            and operational notes.
          </p>
          <p>
            This information is used for review, scheduling, PayPal follow-up,
            activation, support, refunds, and schedule records. Submitted
            information is not sold.
          </p>
          <p>
            Product details may become public when a placement is live. Email
            addresses are kept private and used for operational contact related
            to the submitted request.
          </p>
          <p>
            Visitor counts, device IDs, IP address, user agent, approximate
            location headers, and short-lived session cookies may be used to
            show site activity, including total visitors and active visitors.
            These records are used for site operations and basic analytics.
          </p>
          <p>
            To ask about submitted data or request a correction, contact
            tiktreeapp@gmail.com.
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
