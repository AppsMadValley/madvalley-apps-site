// Vercel Function (served from /api, independent of the Next.js app/ dir —
// this site deploys as static files, see vercel.json). Receives the unlisted
// Launch Day partner application form and forwards it server-to-server to
// Launch Day. The shared secret never reaches the browser.

const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 10_000;
const SUPPORT = "support@madvalley.com";
const GENERIC_ERROR = `Something went wrong, please try again later or email ${SUPPORT}.`;
const FIELDS = ["shopDomain", "email", "consent"] as const;

type Field = (typeof FIELDS)[number];
type Result = { status: number; ok: boolean; error?: string; field?: Field };

function isField(v: unknown): v is Field {
  return typeof v === "string" && (FIELDS as readonly string[]).includes(v);
}

async function submit(input: {
  shopDomain: string;
  email: string;
  consent: boolean;
  honeypot: string;
}): Promise<Result> {
  const baseUrl = process.env.LAUNCH_DAY_API_URL;
  const secret = process.env.PARTNER_APPLICATION_SECRET;
  if (!baseUrl || !secret) {
    console.error("partner-application: LAUNCH_DAY_API_URL or PARTNER_APPLICATION_SECRET is not set");
    return { status: 503, ok: false, error: GENERIC_ERROR };
  }

  let res: Response;
  try {
    // Only the four form fields are forwarded: no IP, cookies, or Origin.
    res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/partner-application`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-partner-application-secret": secret,
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error("partner-application: request to Launch Day failed", err);
    return {
      status: 502,
      ok: false,
      error: `We couldn't reach the server just now. Please try again in a few minutes or email ${SUPPORT}.`,
    };
  }

  if (res.ok) return { status: 200, ok: true };

  // 400 validation, 409 duplicate, 429 rate limit: Launch Day's text is
  // user-presentable, so show it. Everything else is config/infra: log, generic.
  if ([400, 409, 429].includes(res.status)) {
    const data = (await res.json().catch(() => null)) as { error?: unknown; field?: unknown } | null;
    if (data && typeof data.error === "string" && data.error.trim()) {
      return {
        status: res.status,
        ok: false,
        error: data.error.slice(0, 300),
        field: isField(data.field) ? data.field : undefined,
      };
    }
    return { status: res.status, ok: false, error: GENERIC_ERROR };
  }

  console.error(`partner-application: Launch Day responded ${res.status}`);
  return { status: 502, ok: false, error: GENERIC_ERROR };
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Fallback for browsers with JS disabled (native form post): a small HTML page.
function htmlPage(result: Result): Response {
  const body = result.ok
    ? "<h1>Thanks, you're on the list</h1><p>We'll review your application and email you shortly.</p>"
    : `<h1>We couldn't submit that</h1><p>${esc(result.error ?? GENERIC_ERROR)}</p><p><a href="/partners/launch-day/apply/">Go back and try again</a></p>`;
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Launch Day partner application</title></head><body style="font-family:sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem">${body}</body></html>`,
    {
      status: result.status,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    },
  );
}

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  const isForm = contentType.includes("application/x-www-form-urlencoded");
  const respond = (r: Result) =>
    isForm
      ? htmlPage(r)
      : Response.json(
          r.ok ? { ok: true } : { ok: false, error: r.error, ...(r.field ? { field: r.field } : {}) },
          { status: r.status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
        );

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return respond({ status: 413, ok: false, error: "That submission was too large." });
  }

  let data: Record<string, unknown> = {};
  try {
    if (isForm) {
      data = Object.fromEntries(new URLSearchParams(raw));
    } else {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") data = parsed as Record<string, unknown>;
    }
  } catch {
    return respond({ status: 400, ok: false, error: "That submission couldn't be read. Please try again." });
  }

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const consent = data.consent === true || data.consent === "true" || data.consent === "on";

  return respond(
    await submit({
      shopDomain: str(data.shopDomain).trim(),
      email: str(data.email).trim(),
      consent,
      honeypot: str(data.honeypot),
    }),
  );
}

export function GET(): Response {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
