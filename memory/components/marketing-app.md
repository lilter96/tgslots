---
title: "Marketing App"
type: "component"
component: "marketing-app"
tags:
- "memory"
- "component"
- "marketing"
- "react"
aliases:
- "marketing"
up:
- "[[index]]"
- "[[architecture]]"
---
# Marketing App (`apps/marketing`)

## Purpose

Standalone game presentation / marketing site for all `tgslots` slot games. Provides a Hacksaw Gaming-style one-pager per game: full-bleed hero, stats bar, lore/about section, feature grid, and an iframe-based "Play Demo" launcher that embeds the existing Pixi web client without modifying it.

## Package

`@tgslots/marketing` · Vite 6 + React 18 + Tailwind CSS 3 + react-router-dom 6 · dev port **3003**

## File Layout

```
apps/marketing/
  index.html              Google Fonts (Cinzel 400/600/700/900, IM Fell English SC)
  vite.config.ts          React plugin + dev proxy /web-client → http://localhost:3002
  tailwind.config.ts      forest/gold/gold-glow/woodland color tokens, Cinzel fontFamily,
                          pulse-glow + fade-up keyframes
  src/
    main.tsx              createRoot → BrowserRouter > App
    App.tsx               Routes: / → Lobby, /games/:slug → GameRoute (404-safe)
    types.ts              GamePresentation, GameFeature, GameStats interfaces
    styles.css            Tailwind directives, CSS vars, .btn-primary, .btn-outline,
                          .stat-cell, .feature-card utility classes
    components/
      GamePresentationPage.tsx  owns isPlaying state; renders launcher or marketing layout
      HeroSection.tsx           full-viewport hero: bg img + logo + Play Demo / Play for Real
      StatsBar.tsx              4-column grid: Volatility, RTP, Max Win, Paylines (est. badges in DEV)
      LoreSection.tsx           maps lore: string[] to IM Fell paragraphs
      FeatureGrid.tsx           2-column feature cards with SVG icons
      GameLauncher.tsx          fixed inset-0 iframe overlay + close button
      Lobby.tsx                 game card list from registry
    games/
      registry.ts         Record<slug, GamePresentation>
      woodland-whisper.ts Woodland Whisper presentation config (see below)
    assets/
      woodland-whisper/
        hero-bg.svg               1920×1080 forest scene (god rays, hollow tree, god-ray glow)
        feature-free-spins.svg    64×64 gold coin with "2×"
        feature-pick-bonus.svg    64×64 fanned cards
        feature-buy-bonus.svg     64×64 lightning bolt in hexagon
        feature-mystery.svg       64×64 glowing rune ✦
```

## Iframe Integration

`GamePresentationPage` owns `const [isPlaying, setIsPlaying] = useState(false)`.

- "Play Demo" → `setIsPlaying(true)` → renders `<GameLauncher launchUrl="/web-client/?game=woodland-whisper" />`
- `GameLauncher`: `position: fixed; inset: 0; z-50` iframe + close button
- Dev proxy in `vite.config.ts` rewrites `/web-client/*` → `http://localhost:3002/*` so iframe is same-origin
- Prod: reverse-proxy serves web-client at `/web-client/` and marketing at `/`
- **No changes needed to `apps/web-client`**; it already supports `?game=<id>` at `src/main.ts:219-229`

## Game Data (Woodland Whisper)

| Field | Value | Source |
|---|---|---|
| RTP | 88.04% | config/config.json (real) |
| Paylines | 30 Lines | config/config.json (real) |
| Volatility | High | inferred from pick-bonus tail variance (est.) |
| Max Win | 5,000× bet | inferred envelope (est.) |
| Release | Q2 2026 | placeholder (est.) |
| Theme | gold #d4a017, forest #060e04, glow #ffe066, accent #2d7a2d | manifest.ts (real) |

## Adding Future Games

1. Create `src/games/<slug>.ts` implementing `GamePresentation`
2. Add to `src/games/registry.ts`
3. Add per-game SVG assets under `src/assets/<slug>/`
4. Route `/games/<slug>` is already handled generically

## Scripts

| Command | What it does |
|---|---|
| `bun run dev:marketing` | start marketing dev server on port 3003 |
| `bun run dev:all` | starts api + web-client + marketing concurrently |
| `bun --filter @tgslots/marketing run typecheck` | TS check |

## DEV-only UX

`import.meta.env.DEV` gates "est." superscript badges next to inferred stats (Volatility, Max Win, Release). Production builds suppress them.
