import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const TO_EMAIL = "support@madvalley.com";
const FROM_EMAIL = "support@madvalley.com";

// Reject submissions faster than 3 seconds (bots) or older than 1 hour (stale)
const MIN_MS = 3_000;
const MAX_MS = 60 * 60 * 1_000;

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const body = await req.json();
  const { name, email, message, _hp, _t } = body;

  // Honeypot check
  if (_hp) {
    return NextResponse.json({ ok: true }); // silently discard
  }

  // Speed check
  const elapsed = Date.now() - Number(_t);
  if (elapsed < MIN_MS || elapsed > MAX_MS) {
    return NextResponse.json({ ok: true }); // silently discard
  }

  // Basic field validation
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    replyTo: email,
    subject: `Contact form — ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
  });

  return NextResponse.json({ ok: true });
}
