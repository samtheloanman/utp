# Design System — Uniting the People (UtP)

**Canonical. Civic glass-teal, light-first.** Adopted 2026-10-18.
The old dark "uBTC" system is retired and lives in `archive/design-dark-v1/` for reference only; don't use it for new work.

- **Source of truth in code:** `src/app/globals.css` (CSS custom properties on `:root`)
- **Logo & brand spec:** `design_tmp/utp/project/uniting-the-people/Logo & Brand.html` (Claude Design handoff)
- **Not this:** the Anthropic `brand-guidelines` skill (Poppins/Lora/coral) does not apply to UtP.

## 1. Character
Trustworthy civic infrastructure, not crypto hype. Calm, clear, evidence-first. Light backgrounds, deep teal ink, one bright teal for action, a warm gold used sparingly. Depth comes from soft ink-tinted shadows, not glows.

## 2. Color tokens (`:root`)
| Token | Hex | Use |
|---|---|---|
| `--ink` | `#082A33` | Body text, max contrast |
| `--ink-soft` | `#2A4750` | Secondary text |
| `--muted` | `#5E7A82` | Supporting copy, labels |
| `--faint` | `#93A8AE` | Meta, placeholders |
| `--primary` | `#17A6C8` | Actions, links, the mark |
| `--primary-deep` | `#0E7C96` | Headings accents, hover, focus ring |
| `--primary-soft` | `#E2F3F7` | Tints, selected states |
| `--accent` | `#C9952F` | Warmth — sparingly |
| `--accent-soft` | `#F7EDD6` | Accent tints |
| `--bg` / `--bg-deep` | `#F4F8F9` / `#E8F1F3` | Page backgrounds |
| `--surface` / `--surface-2` | `#FFFFFF` / `#F6FAFB` | Cards, inputs |
| `--border` / `--border-2` / `--hairline` | `#E1EAEC` / `#CCDADD` / `#EEF4F5` | Dividers |
| `--ring` | `#0E7C96` | Focus outline |

**Vote semantics** (always pair color with a label or icon, never color alone):
| Token | Hex | Meaning |
|---|---|---|
| `--for` / `--for-soft` | `#1F9D6B` / `#E2F4EC` | For / yes |
| `--against` / `--against-soft` | `#E0524D` / `#FBE9E8` | Against / no, live indicator |
| `--unsure` / `--unsure-soft` | `#8A99A0` / `#EDF1F2` | Undecided |

**Brand ramp** (logo, illustration, app icon): aqua `#6FD9EC` → cyan `#17A6C8` → teal `#0E7C96` → deep `#0A5466` → ink `#082A33`; sand `#CBB996` accent; mist `#EAF3F5`, paper `#F7FAFB`. Dark grounds (app icon, photo badges) use the gradient `#0C617A → #06323E`; that is the only place dark surfaces appear.

Never hardcode hex in components — use the tokens.

## 3. Typography
- **Display / headings:** Schibsted Grotesk, weight 800, tracking `-0.025em` (`--display`)
- **Body / UI:** Inter 400–700
- **Data & numbers:** JetBrains Mono with tabular figures (`.mono`)
- Loaded via Google Fonts in `globals.css`. Bebas Neue is loaded as an optional display variant (`data-display="bebas"`) — not the default.

## 4. Shape, depth, density
- Radii: `--r-sm 9px`, `--r-md 13px`, `--r-lg 18px`, `--r-pill 999px`
- Shadows (ink-tinted): `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Density: `data-density="compact" | "comfortable"` drives `--card-pad`, `--feed-gap`, `--grid-min`
- Sticky top bar: white at 85% opacity + 16px backdrop blur

## 5. Components (classes in `globals.css`)
- Buttons: `.btn` + `.btn-primary` (teal fill, soft teal shadow), `.btn-ghost` (surface + border), `.btn-quiet` (text only); sizes `.btn-sm`, `.btn-lg`, `.btn-block`
- Live indicator: `.live-dot` (pulsing `--against`)
- Icons: `lucide-react`, line style, inherit `currentColor`

## 6. Logo rules
From the brand spec: keep clearspace, respect minimum sizes, and don't rotate, stretch, recolor, or add effects to the mark.

## 7. Content rules (from the PRD)
- Label every vote surface as one of: off-chain sentiment, wallet-signed, or binding on-chain.
- Financial features (vault, stablecoin, token, markets) must show an explicit **gated / not live** state until configured, tested, and approved. No placeholder addresses, no "verified" badges without a real verifier.
- Separate evidence, interpretation, and community sentiment visually.
