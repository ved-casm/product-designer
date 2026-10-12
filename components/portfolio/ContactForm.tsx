"use client";

import { useState, type FormEvent } from "react";
import { PROFILE } from "./content";
import "./ContactForm.css";

const ENDPOINT = "https://ved-portfolio-nine.vercel.app/api/contact-relay";
const BOOKING_URL = "https://cal.com/vedankgaur/quick";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    setError("");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: "product",
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
          company: data.get("company"),
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || "Couldn't send right now.");
      form.reset();
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send right now.");
      setStatus("error");
    }
  };

  return (
    <div className="cform" id="contact-form">
      <div className="cform-card">
        <div className="cform-head">
          <p className="cform-eyebrow">send a note</p>
          <h3 className="cform-title">
            tell me about the <em>product</em>
          </h3>
        </div>

        {status === "sent" ? (
          <div className="cform-done" role="status">
            <p className="cform-done-title">
              message sent <span aria-hidden>✓</span>
            </p>
            <p>thanks! a copy of what you wrote is on its way to your inbox, and i reply within 24 hours.</p>
            <button type="button" className="cform-link" onClick={() => setStatus("idle")}>
              send another
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="cform-form">
            <div className="cform-row">
              <label className="cform-field">
                <span className="cform-num">01</span>
                <span className="cform-label">name</span>
                <input name="name" type="text" required maxLength={120} autoComplete="name" placeholder="your name" />
                <i className="cform-beam" aria-hidden />
              </label>
              <label className="cform-field">
                <span className="cform-num">02</span>
                <span className="cform-label">email</span>
                <input name="email" type="email" required maxLength={200} autoComplete="email" placeholder="you@company.com" />
                <i className="cform-beam" aria-hidden />
              </label>
            </div>
            <label className="cform-field">
              <span className="cform-num">03</span>
              <span className="cform-label">what are you building?</span>
              <textarea name="message" required maxLength={4000} rows={4} placeholder="a few lines about the product, the stage and the timeline" />
              <i className="cform-beam" aria-hidden />
            </label>
            <input className="cform-hp" name="company" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div className="cform-foot">
              <button type="submit" className="cform-submit" disabled={status === "sending"}>
                <span>{status === "sending" ? "sending..." : "send message"}</span>
                <span className="cform-arrow" aria-hidden>
                  ↗
                </span>
              </button>
              <p className="cform-note">reply within 24 hours</p>
            </div>
            {status === "error" && (
              <p className="cform-error" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>

      <aside className="cform-cta">
        <i className="cform-cta-beam" aria-hidden />
        <div className="cform-cta-top">
          <span className="cform-avatar" style={{ backgroundImage: `url(${PROFILE.portrait})` }} role="img" aria-label="Vedank Gaur" />
          <span className="cform-avail">
            <span className="cform-dot" />
            taking new products
          </span>
        </div>
        <h3 className="cform-title">
          prefer to <em>talk?</em>
        </h3>
        <p className="cform-cta-copy">grab a slot on my calendar. we go through the product, the goal and what shipping it looks like.</p>
        <ul className="cform-chips">
          <li>30 min</li>
          <li>intro call</li>
          <li>no prep needed</li>
        </ul>
        <a className="cform-book" href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
          <span>book a call</span>
          <span className="cform-arrow" aria-hidden>
            ↗
          </span>
        </a>
      </aside>
    </div>
  );
}
