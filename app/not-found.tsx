import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page doesn't exist. Head back to Vedank Gaur's portfolio.",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="nf">
      <p className="nf-code" aria-hidden>
        404
      </p>
      <h1 className="nf-title">
        this stream ran <em>dry.</em>
      </h1>
      <p className="nf-copy">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="nf-links">
        <Link href="/" className="resume-btn">
          <span>back to home</span>
          <span className="resume-btn-icon" aria-hidden>
            ↗
          </span>
        </Link>
        <Link href="/work" className="resume-btn">
          <span>all works</span>
          <span className="resume-btn-icon" aria-hidden>
            ↗
          </span>
        </Link>
      </div>
    </main>
  );
}
