# Blindside — UI/UX requirements

Blitz v10 build. Mobile-first (Solana Seeker / Android Chrome), desktop for the demo video.
Everything shown is real: live Pyth Lazer SOL/USD, real devnet transactions, real players. No mock data anywhere in the UI, including empty states and demos.

---

## 1. What the interface has to do

1. Let someone make a call (up or down) on live SOL in one tap.
2. Make the hidden close *felt*: during a round, nobody knows where the starting line is.
3. Deliver one unforgettable moment per round: the reveal.
4. Prove every result: each round links to its VRF proof, oracle prices and explorer transactions.
5. Bring people back with streaks, sets and scheduled rounds — never by pushing them to chase losses.

### Design principles

- **The reveal is the only spectacle.** Everything else is quiet, fast and disciplined.
- **Fog means unknown.** Fog is used only for information nobody has yet. Never as decoration.
- **Honest instruments.** Every number on screen is real and traceable. Refunds look like refunds, losses look like losses.
- **One thumb.** Every primary action sits in the bottom 40% of a phone screen.
- **Plain words.** Darkroom lives in the visuals and sound, not in the copy.

---

## 2. Round rhythm (decision needed for the program too)

Overlapping 60-second rounds make the UI juggle two rounds at once. Use a fixed **90-second cycle** instead:

| Time | Phase | What the player can do | What they see |
|---|---|---|---|
| 0–10s | **Open — counts for sure** | Make a call | Clear chart, "Your call counts" |
| 10–50s | **Open — hidden close somewhere** | Make a call | Fog creeps in from the right; "Counts if made before the hidden close: 72%" |
| 50–80s | **Developing** | Nothing (calls closed) | Live price keeps moving under full fog; starting line hidden |
| 80–83s | **Reveal** | Watch | Lights on, starting line drops at the hidden close, result lands |
| 83–90s | **Result** | Share, view proof, call the next round | Payout or refund, card if earned, next-round countdown |

- The hidden close is uniform in 10–50s; settlement is the price 30s after it, so it always lands by 80s.
- The reveal happens at 80s for every round, whatever the close time.
- Probability shown in 10–50s: `1 − (t − 10) / 40`, rounded to 5%.

---

## 3. Visual direction: "Darkroom" (superseded)

> **Update 2026-11-20:** the built app in `/web` uses a Mobbin-derived design system instead — white/near-black neutrals, opacity-based surfaces, pill buttons, 24px card radius, Geist type at weights 456/600/652, green/red for up/down with arrow glyphs. Tokens live in `web/app/globals.css`. The darkroom palette below is kept for reference only; screens, states, copy and guardrails in the rest of this doc still apply.

A round is a photograph developing. The chart is latent until the reveal, when the lights come on and the print appears. Cards are prints; sets are contact sheets.

Why this and not a trading terminal: every up/down app looks like a green-and-red exchange. The darkroom is about waiting for an image you can't see yet — exactly what a hidden close feels like.

### Color

| Name | Hex | Use |
|---|---|---|
| Safelit | `#2B1612` | Background during open and developing phases (deep oxblood, not black) |
| Ember | `#E0533A` | The safelight: timer progress, live dot, focus ring. Used sparingly |
| Silver | `#CFCBC2` | Price line, primary text on dark |
| Emulsion | `#7A716A` | Fog base (rendered with grain, 0–85% opacity) |
| Print white | `#F5F5F1` | "Lights on" background for reveal and result |
| Blue toner | `#4F8FA6` | **Up** calls and up outcomes |
| Sepia toner | `#A8693C` | **Down** calls and down outcomes |

- Up/down never rely on color alone: up = upward glyph + above the line + blue; down = downward glyph + below the line + sepia. Blue/sepia stays distinguishable for red-green color blindness.
- The interface is dark while the image is latent and light once it's developed. The reveal *is* the lights coming on (a 600ms ramp, never a flash).
- Text contrast meets WCAG AA in both the safelit and print-white states.

### Type

| Role | Face | Notes |
|---|---|---|
| Numerals: timer, price, payout | **Big Shoulders Display** | Tall, condensed, industrial — reads like a darkroom timer. Confirm tabular figures; fall back to a tabular sans for the live price if not |
| Everything else | **Atkinson Hyperlegible Next** | Built for legibility; distinct from the condensed numerals |

- Sentence case everywhere. No all-caps labels, no monospace data labels, no arrows appended to buttons.
- Type scale (mobile): 12 / 14 / 16 / 20 / 28 / 44 / 72 (72 only for the reveal result).

### Sound and haptics (off by default, one toggle)

- Call placed: short enlarger-switch click + light haptic.
- Hidden-close window: a soft timer tick once per second, 10–50s only.
- Reveal: lights-on hum swell, then a single tone (higher for up, lower for down). No coin sounds.
- Refund: neutral paper slide. Never a win-like sound.

---

## 4. Screens

### 4.1 Live round (home)

```
┌───────────────────────────────┐
│ ◔ 0:37   Round 1,204   ◉ live │  timer dial (ember), round, live dot
│ Your calls developing: ▢ ▢    │  strip of your open rounds
│                               │
│   SOL  $71.97                 │  live price, numerals face
│  ┌─────────────────────────┐  │
│  │ ~~~~~/\/~~~░░░░▓▓▓▓▓▓▓  │  │  chart; fog thickens rightwards
│  │            ░░░░▓▓▓▓▓▓▓  │  │  as the close becomes likely
│  └─────────────────────────┘  │
│  Counts if made before the    │
│  hidden close: 70%            │
│                               │
│  Stake  [1] [5] [10] [25]     │  chips, last stake preselected
│ ┌─────────────┐┌─────────────┐│
│ │  ▲ Call up  ││ ▼ Call down ││  56px+ tall, thumb zone
│ └─────────────┘└─────────────┘│
│  Free call   Prints  Standings│  bottom nav
└───────────────────────────────┘
```

Requirements
- Chart renders at 60fps from oracle updates (50–200ms) with interpolation; last 90s visible.
- Fog density follows the probability the close has passed; it never reveals where the close is.
- After a call: buttons show "Called up · $5" for that round, the call appears in the "developing" strip, and a toast links the transaction. No cancel button anywhere.
- During 50–80s the buttons switch to "Calls closed — next round in 0:27".
- Pools, call counts and the up/down split are never shown before the reveal.

### 4.2 Reveal (80–83s, full-screen moment)

Sequence (orchestrated, ~2.4s, respects reduced motion):
1. 0–600ms: background ramps safelit → print white ("lights on"); fog dissolves left to right like developer washing over paper.
2. 600–1200ms: the starting line drops onto the chart at the hidden close; a marker reads "Hidden close: 0:23".
3. 1200–1800ms: the settlement point lands 30s later; the segment between them fills blue toner (up) or sepia toner (down).
4. 1800–2400ms: the result appears in 72pt numerals: "Up +0.41%".

Reduced motion: no ramp or wash; crossfade to the final state in 200ms.

### 4.3 Result (83–90s)

- Your outcome, plainly: "You called up · Won $8.40", "You called down · Lost $5", or "Refunded $5 · your call was placed after the hidden close".
- The round's crowd stats, now revealed: players, up/down split, pot.
- "Proof" button → proof drawer. "Share" button → reveal image.
- Card earned (rare events only): the print slides out of the tray once, then sits in Prints.
- Next-round countdown with the call buttons live again.

### 4.4 Proof drawer

- VRF request and fulfilment transactions, with the verified proof.
- Hidden close time, starting price and settlement price, each with its oracle update.
- Payout transaction on Solana (shown as "Confirmed on Solana" only after the base-layer check).
- One-line plain explanation: "The close was picked by VRF before the round opened and kept inside MagicBlock's private rollup until now."

### 4.5 Prints (collection)

- Grid of earned cards; each shows the round's real chart, close marker and result.
- Contact sheets (sets) with progress, e.g. "Last-second close · 2 of 3".
- Card detail flips to its proof.
- Empty state: "Prints come from rare rounds — a close in the last second, a move over 1%, or five right in a row."

### 4.6 Standings (season)

- Weekly table: net result, longest streak, rarest prints. Your row pinned.
- Labelled as a season table, never as a skill ranking.
- Free calls have their own table with no rewards.

### 4.7 History

- Every call with round, side, stake, outcome and a proof link. Filter: won / lost / refunded / voided.

### 4.8 How it's fair

- One screen, plain language: hidden close, why late calls are refunded, what the private rollup hides, who could see the close (VRF operators; anyone with physical access to the enclave machines), and what happens on a stalled price feed.

### 4.9 Settings

- Sound, haptics, reduced motion (follows the system by default), session limit (time and loss), and the free-calls default.

---

## 5. Onboarding

1. Connect wallet (Wallet Adapter; Mobile Wallet Adapter on Seeker).
2. One signature does both: creates the session key and the private-rollup auth token. Copy: "Sign once to play without pop-ups for the next 24 hours."
3. Devnet only: "Get test USDC" button from the faucet.
4. First round is coached inline, with three short notes on the live screen: the hidden close, the fog, the reveal. No carousel.

---

## 6. Engagement (allowed) and guardrails (required)

| Use | How it shows up |
|---|---|
| Streaks | Forecast streak counter on the live screen; streak freezes are earned, never bought |
| Free calls | Stake 0 on any round; builds streaks and the free table |
| Sets | Contact-sheet progress in Prints |
| Scheduled rounds | Prime Time rounds at fixed hours with a host banner |
| Shareable moments | Reveal image with chart, close marker and result |
| Social proof | Round crowd stats after the reveal only |

| Never | Reason |
|---|---|
| Autoplay or "same bet again" | Removes the decision; banned for UK online slots |
| Win-style feedback on refunds or losses | Losses disguised as wins; banned for UK online slots |
| "Win it back" prompts | Classic loss-chasing trigger |
| Money in notifications | Notifications only for streaks, sets and Prime Time |
| Near-miss drama | Never stage "you almost won" |

Required: session summary and soft pause every 20 rounds; session time visible in the header after 15 minutes; limits in Settings.

---

## 7. Errors and empty states

| Situation | Copy |
|---|---|
| Price feed stalled at close or settlement | "Round voided — the SOL price feed stalled. All calls refunded." |
| Tick missed near the close | "Round voided — we couldn't record the starting price. All calls refunded." |
| Call landed after the close | "Refunded $5 — your call arrived after the hidden close." |
| Payout not yet confirmed on Solana | "Paying out… confirming on Solana" (retries automatically) |
| Wallet has no USDC | "Add test USDC to make a call, or make a free call." |
| Private rollup unreachable / region blocked | "Can't reach the private rollup from your region. Free calls still work." (only if true for free calls) |
| No rounds won yet in Prints | See 4.5 empty state |

---

## 8. Accessibility and performance

- Tap targets ≥ 48px; call buttons ≥ 56px tall.
- Screen readers: a polite live region announces phase changes ("Calls closed", "Reveal: up 0.41 percent, you won 8 dollars 40").
- Up/down distinguishable without color (glyph + position).
- Reduced motion: fog becomes a static hatch; reveal is a crossfade.
- 60fps on a mid-range Android: canvas chart, pre-rendered grain texture for fog, no layout thrash during rounds.
- Live data: subscribe where possible; poll every 250ms as fallback. Show a small "reconnecting" state, never a frozen chart.

---

## 9. One-week priority

**P0 — must ship (the demo depends on these)**
- Onboarding with one signature; devnet USDC button.
- Live round screen with all five phases, fog, stake chips, call buttons, developing strip.
- Reveal sequence (+ reduced-motion version).
- Result screen: won / lost / refunded / voided.
- Proof drawer with explorer links.
- History list.

**P1 — ship if on track by Day 5**
- Prints with rare-event cards and one contact sheet.
- Streak counter, free calls, session summary + limits.
- Share image of the reveal.
- Sound and haptics.

**P2 — cut first**
- Standings tables, Prime Time schedule, desktop sidebar layout, weekly recap.

### P0 acceptance checks

- A call placed at 5s always counts; a call placed after the hidden close is refunded and labelled as such.
- Nothing on screen (or in the network tab of a non-member wallet) reveals the close time, pools or split before 80s.
- The reveal plays at 80s on every client within 300ms of each other.
- Every result links to real transactions that open in Solana Explorer.
- The live price on screen matches an independent source within normal oracle lag.
