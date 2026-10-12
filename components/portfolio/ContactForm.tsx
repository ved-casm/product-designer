"use client";

import { useState, type FormEvent } from "react";
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
        <p className="cform-eyebrow">send a note</p>
        <h3 className="cform-title">
          tell me about the <em>product</em>
        </h3>

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
          <form onSubmit={onSubmit} noValidate={false} className="cform-form">
            <label className="cform-field">
              <span>name</span>
              <input name="name" type="text" required maxLength={120} autoComplete="name" placeholder="your name" />
            </label>
            <label className="cform-field">
              <span>email</span>
              <input name="email" type="email" required maxLength={200} autoComplete="email" placeholder="you@company.com" />
            </label>
            <label className="cform-field">
              <span>message</span>
              <textarea name="message" required maxLength={4000} rows={5} placeholder="what are you building?" />
            </label>
            <input className="cform-hp" name="company" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            {status === "error" && (
              <p className="cform-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="cform-submit" disabled={status === "sending"}>
              <span>{status === "sending" ? "sending..." : "send message"}</span>
              <span className="cform-arrow" aria-hidden>
                ↗
              </span>
            </button>
          </form>
        )}
      </div>

      <aside className="cform-cta">
        <p className="cform-eyebrow">prefer to talk?</p>
        <h3 className="cform-title">
          book a <em>call</em>
        </h3>
        <p className="cform-cta-copy">pick a slot that works for you. quick 30 minute intro, no prep needed.</p>
        <a className="cform-submit cform-submit--ghost" href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
          <span>book a call</span>
          <span className="cform-arrow" aria-hidden>
            ↗
          </span>
        </a>
        <p className="cform-reply">or just wait for my reply - usually within 24 hours.</p>
      </aside>
    </div>
  );
}
