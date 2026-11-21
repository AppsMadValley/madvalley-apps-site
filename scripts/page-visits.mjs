// Daily page-visit check for the partner apply page (devhq daily briefing).
//
// Reads Vercel Web Analytics for apps.madvalley.com/partners/launch-day/apply over the last 24 hours and
// writes it to the "Page visits (last 24 hours)" issue in this repository, so the morning briefing can
// read it. Never fails the run because of traffic; it fails only when the numbers can't be read.
//
// Vercel's count endpoint rounds to whole days, so this reads hourly buckets and adds up the last 24.
// The window runs from the start of the hour 24 hours ago through now. Page views are exact. Visitors are unique within each hour, then added up, so someone who visits in
// two different hours counts twice (the Vercel dashboard's "Last 24 Hours" view shows true uniques).
// Web Analytics only has data from 2026-11-21, when it was turned on.
//
// Uses `vercel api` (the Vercel CLI, pinned) because the same call through the Vercel MCP returned 404.
// Env: VERCEL_TOKEN (repo secret: a Vercel access token for the team), GITHUB_TOKEN, GITHUB_REPOSITORY.
// Run locally without GitHub writes, using the CLI's own login:
//   VERCEL_BIN=vercel DRY_RUN=1 node scripts/page-visits.mjs

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const PROJECT_ID = "prj_m8278bli3b1RJDHEBQF7nWactXzJ"; // madvalley-apps-site
const TEAM_ID = "team_g2ljtvYMi7fEj3hcvvAfrymM";
const PAGE = "/partners/launch-day/apply";
const ISSUE_TITLE = "Page visits (last 24 hours)";
const ISSUE_LABEL = "page-visits";

const env = process.env;
const DRY_RUN = env.DRY_RUN === "1";

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

if (!DRY_RUN && !env.VERCEL_TOKEN) fail("VERCEL_TOKEN secret is not set (Settings > Secrets and variables > Actions).");

// From the start of the hour that contains "24 hours ago" through now, including the current partial
// hour (so the window is 24 to 25 hours, never missing the most recent visits).
const HOUR = 3_600_000;
const now = Date.now();
const since = new Date(Math.floor((now - 24 * HOUR) / HOUR) * HOUR);
const until = new Date(now);

const bin = env.VERCEL_BIN ? env.VERCEL_BIN.split(" ") : ["npx", "--yes", "vercel@59.11.7"];
const query = new URLSearchParams({
  projectId: PROJECT_ID,
  teamId: TEAM_ID,
  since: since.toISOString(),
  until: new Date(Math.ceil(now / HOUR) * HOUR).toISOString(),
  by: "hour",
  filter: `requestPath eq '${PAGE}'`,
});

let json;
try {
  // Never print the command line or err.message: they would contain the token.
  const out = execFileSync(
    bin[0],
    [...bin.slice(1), "api", `/v1/query/web-analytics/visits/aggregate?${query}`, "--method", "GET", ...(env.VERCEL_TOKEN ? ["--token", env.VERCEL_TOKEN] : [])],
    { encoding: "utf8", maxBuffer: 50_000_000, stdio: ["ignore", "pipe", "pipe"] },
  );
  json = JSON.parse(out.slice(out.indexOf("{")));
} catch (err) {
  const detail = String(err.stderr || err.stdout || "no output").replaceAll(env.VERCEL_TOKEN ?? "\0", "***").slice(0, 300);
  fail(`vercel api web-analytics failed: ${detail}`);
}

if (!Array.isArray(json?.data)) fail("Unexpected web analytics JSON shape (expected a data array). The API may have changed.");

const rows = json.data.filter((r) => new Date(r.timestamp) >= since && new Date(r.timestamp) <= until);
const pageviews = rows.reduce((a, r) => a + (r.pageviews ?? 0), 0);
const visitors = rows.reduce((a, r) => a + (r.visitors ?? 0), 0);
const label = (d) => d.toISOString().slice(0, 16).replace("T", " ") + " UTC";

const body = [
  `**${visitors} visitor${visitors === 1 ? "" : "s"}, ${pageviews} page view${pageviews === 1 ? "" : "s"}** on \`${PAGE}\` in the last 24 hours (up to the latest hour recorded).`,
  "",
  `- **Window:** ${label(since)} to ${label(until)}.`,
  "- **Visitors** are unique within each hour, then added up, so a person who visits in two different hours counts twice. The Vercel dashboard's Last 24 Hours view shows true unique visitors.",
  "- Web Analytics only has data from 2026-11-21, when it was turned on. Ad blockers hide some visits.",
  "",
  `Updated by the daily page visits check. Source: \`scripts/page-visits.mjs\`.`,
].join("\n");

const summaryLine = `${visitors} visitors, ${pageviews} page views on ${PAGE} (${label(since)} to ${label(until)})`;
console.log(summaryLine);
if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${body}\n`);
if (DRY_RUN) console.log(`\n${body}`);

// --- GitHub issue -------------------------------------------------------------------------------

async function github(method, path, payload) {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(payload ? { "Content-Type": "application/json" } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await res.text();
  if (!res.ok && !(method === "POST" && path === "/labels" && res.status === 422)) {
    fail(`GitHub ${method} ${path} returned HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

if (!DRY_RUN) {
  await github("POST", "/labels", { name: ISSUE_LABEL, color: "0e8a16", description: "Daily page visits check" });
  const open = await github("GET", `/issues?state=open&labels=${ISSUE_LABEL}&per_page=10`);
  let issue = open.find((i) => i.title === ISSUE_TITLE && !i.pull_request) ?? null;
  if (issue) await github("PATCH", `/issues/${issue.number}`, { body });
  else issue = await github("POST", "/issues", { title: ISSUE_TITLE, body, labels: [ISSUE_LABEL] });
  await github("POST", `/issues/${issue.number}/comments`, { body: summaryLine });
  console.log(`Updated ${issue.html_url}`);
}
