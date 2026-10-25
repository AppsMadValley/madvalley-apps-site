This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment variables

Set in Vercel (Production and Preview). Used by `api/partner-application.ts`, the server-side function behind the unlisted Launch Day partner application page (`/partners/launch-day/apply/`):

| Name | Value | Sensitive |
| --- | --- | --- |
| `LAUNCH_DAY_API_URL` | `https://launchday-chi.vercel.app` (Launch Day base URL) | no |
| `PARTNER_APPLICATION_SECRET` | Shared secret. Must match the same variable in the Launch Day Vercel project; rotating it means changing both projects. | yes |

If either is unset the endpoint returns a friendly 503 and never forwards. `RESEND_API_KEY` is used only by the legacy `app/api/contact` route.

Note: `vercel.json` makes this site deploy as static files (root `index.html`), so the Next.js `app/` directory, including `app/api/contact`, is not served in production. Serverless endpoints must live in the root `api/` directory. The partner page is unlisted by design: do not link it from nav, footer, or home, and do not add it to a sitemap.
