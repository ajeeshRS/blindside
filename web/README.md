# Blindside web

Next.js 16 (App Router, Turbopack) + Tailwind 4.

```bash
pnpm dev     # http://localhost:3000
pnpm build
```

- `app/(marketing)` — landing page
- `app/(app)` — Play, Prints, Standings, History, Fair, Settings
- `components/ui` — design system (blueprint panels, buttons, pills, modal, switch, theme)
- `lib/price-feed.ts` — live SOL/USD from MagicBlock's rollup (websocket, polling fallback)
- `lib/schedule.ts` — the 90-second round clock

Calls go through `@blindside/client` (`packages/client`), the same client the keeper and tests use (being wired in).
