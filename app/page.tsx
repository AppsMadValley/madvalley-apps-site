"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
      _hp: (form.elements.namedItem("_hp") as HTMLInputElement).value,
      _t: (form.elements.namedItem("_t") as HTMLInputElement).value,
    };

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setStatus("sent");
      formRef.current?.reset();
    } else {
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans">
      <header className="border-b border-gray-100 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <span className="text-2xl font-bold tracking-tight text-gray-900">Mad Valley Productions</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">

        <section>
          <p className="text-lg text-gray-500">We build tools for independent farmers market vendors.</p>
        </section>

        <section className="space-y-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Apps</h2>
          <a
            href="https://apps.shopify.com"
            className="block border border-gray-200 rounded-xl p-6 hover:border-green-700 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#008060" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.9" />
                  <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.7" />
                  <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.7" />
                  <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.5" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                  PopUp: Sell by Weight
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Weight-based selling for Shopify POS. Built for farmers market vendors — sell produce, cheese, meat, and more by the pound or ounce, directly from your POS tile grid.
                </p>
                <span className="inline-block mt-3 text-xs font-medium text-green-700">
                  View on Shopify App Store →
                </span>
              </div>
            </div>
          </a>
        </section>

        <section className="space-y-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Contact</h2>
          <div className="max-w-lg">
            {status === "sent" ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-800">
                Message sent — we&apos;ll get back to you shortly.
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot: hidden from humans, bots fill it in */}
                <input type="text" name="_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: "none" }} />
                {/* Timestamp used server-side to reject instant submissions */}
                <input type="hidden" name="_t" value={Date.now().toString()} />

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    id="name" name="name" type="text" required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    id="email" name="email" type="email" required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    id="message" name="message" required rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
                  />
                </div>

                {status === "error" && (
                  <p className="text-sm text-red-600">Something went wrong — please try again.</p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: "#008060" }}
                >
                  {status === "sending" ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      <footer className="border-t border-gray-100 px-6 py-8 text-sm text-gray-400">
        <div className="max-w-4xl mx-auto">
          © {new Date().getFullYear()} Mad Valley Productions
        </div>
      </footer>
    </main>
  );
}
