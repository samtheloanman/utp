# ARCHIVED — Dark "uBTC" design system (v1)

**Status: retired 2026-10-18. Do not use for new work.**

The canonical UtP brand is the civic glass-teal system in `/DESIGN.md` (implemented in `src/app/globals.css`).

## What's here
| File | Was | Notes |
|---|---|---|
| `docs/DESIGN.md` | root `DESIGN.md` | Dark cyberpunk system: `#06080B` background, BTC gold `#F7931A`, neon cyan `#00E5FF`, emerald `#00FF66` |
| `docs/next-prompt.md` | root `next-prompt.md` | Stitch generation prompt for the dark `/launch` page |
| `docs/SITE.md` | root `SITE.md` | Stitch sitemap for the dark site |
| `app/launch/page.tsx` | `/launch` route | uBTC token launch landing page |
| `app/vault/page.tsx` | `/vault` route | Privy waitlist + shadow-vote + vault prototype |

## Why it was pulled (not restyled)
Beyond the brand conflict, both pages presented financial features as live, which the PRD forbids ("No interface may imply a financial feature is live when it is unconfigured, unaudited, or legally gated"):
- A hardcoded placeholder BTC deposit address
- "Proof of Reserves: Verified" and "100% physically backed. Cryptographically guaranteed." copy
- A simulated vote that only wrote to `localStorage`

Also removed at the same time (nothing selected them; the app hardcodes `data-palette="civic"`):
- `[data-palette="btc"]` (BTC orange `#F7931A` primary) and `[data-palette="forest"]` blocks from `src/app/globals.css` — recover from git history before commit `chore/teal-brand-and-roadmap`
- Tailwind `btc` color (`#F7931A`, `#FDB44B`) from `tailwind.config.ts`

`/launch` and `/vault` now redirect to `/` (see `next.config.ts`). If a vault or launch surface returns, rebuild it in the teal system behind an explicit gated/unavailable state (Roadmap Phase 4).

This folder is excluded from TypeScript, ESLint, and the Next.js build.
