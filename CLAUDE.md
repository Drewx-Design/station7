# Xenobiology Station 7 — AI Creature Builder

## What This Is

An AI-powered creature-building game where players select biological traits across four categories (FORM, FEATURE, ABILITY, FLAW), a scientist AI reacts in real-time via streaming text, and the creature is "brewed" into a specimen report. This is NOT a static form — the scientist character has persistent memory within a session, emotional moods that shift the entire visual atmosphere, and streaming micro-judgments on every trait selection.

## Core Architecture

### Single State Container

All game state lives in `Game.tsx` — no Redux, Zustand, or Context. State flows down via props to child components. This is intentional: the game has a single screen with a linear flow.

**Game Phases:** `'loading'` → `'drafting'` → `'brewing'` → `'reveal'`

### Two Streaming Patterns

**Pattern 1 — useObject (non-cancellable streams):**
Used by `generate-round` and `brew`. The Vercel AI SDK hook manages stream lifecycle, partial object state, and loading state.

```typescript
const roundStream = useObject({
  api: '/api/generate-round',
  schema: RoundSchema,
});
```

**Pattern 2 — Raw fetch + partial-json (cancellable streams):**
Used by `micro-judgment` only. Uses `AbortController` so selecting a new trait cancels the in-flight judgment. Reads `ReadableStream` via `getReader()`, accumulates text, and parses incrementally with `parsePartialJson()`.

```typescript
abortRef.current = new AbortController();
const res = await fetch('/api/micro-judgment', {
  method: 'POST',
  signal: abortRef.current.signal,
  body: JSON.stringify({ scenario, selections, priorNotes, priorMoods }),
});
```

### Scientist Memory

The scientist character maintains coherent personality across trait selections:

- Client accumulates `accumulatedNotes[]` and `moodTrajectory[]`
- Both are sent back to the API on each micro-judgment and brew call
- Swapping a trait (replacing an existing selection) clears memory
- Cross-round continuity via `creatureCount` parameter modifying the system prompt
- Brew route caps notes to 6 to control token cost

### Ambient Mood System

Micro-judgment returns a `color` field (hex). `Game.tsx` sets it as `--mood-color` CSS custom property on `<html>`. This flows through to:
- `MoodLayer` radial gradient background
- Trait card selection glows
- Brew button pulse animation
- Scroll mask gradient

The entire visual tone shifts with the scientist's emotional state.

### Fallback Round

`FALLBACK_ROUND` provides a hardcoded `Round` so UI renders instantly while the real round streams from the API. If the user hasn't selected anything when the API round arrives, it replaces the fallback.

## Key Files

### Entry Points
- `src/app/page.tsx` — Single line: renders `<Game />`
- `src/app/layout.tsx` — Root layout with 3 fonts and metadata
- `src/app/error.tsx` — "CONTAINMENT BREACH" error boundary
- `src/app/loading.tsx` — "Station 7 initializing..." loading state

### Game Core
- `src/components/Game.tsx` — GOD COMPONENT: all game state, phase management, streaming orchestration (367 lines)
- `src/components/TraitAccordion.tsx` — Accordion trait selector with expand/collapse
- `src/components/TraitCard.tsx` — Individual trait button (uses `data-selected` attribute)
- `src/components/LabNotes.tsx` — Scientist streaming panel with auto-scroll
- `src/components/ScenarioBar.tsx` — Field log header + scenario text
- `src/components/CreatureCard.tsx` — Specimen report with staggered field reveal animations
- `src/components/MoodLayer.tsx` — Ambient background div (5 lines, CSS-driven)
- `src/components/Bestiary.tsx` — Horizontal scroll archive of past creatures

### API Routes
- `src/app/api/generate-round/route.ts` — POST: streams a Round (scenario + 16 traits, 4 per category)
- `src/app/api/micro-judgment/route.ts` — POST: streams scientist reaction to trait selections
- `src/app/api/brew/route.ts` — POST: streams final Creature specimen record

### Schemas & Prompts
- `src/lib/schemas.ts` — All Zod schemas + exported TS types via `z.infer`
- `src/lib/prompts.ts` — 3 system prompts: GENERATE_ROUND, MICRO_JUDGMENT, BREW
- `src/lib/models.ts` — Model ID constants (`SONNET_MODEL`, `BREW_MODEL`)
- `src/lib/fallback-round.ts` — Hardcoded Round for instant UI

### Infrastructure
- `src/middleware.ts` — IP-based rate limiter (30 req/60s on `/api/*`)
- `src/app/globals.css` — ALL styling (806 lines, custom CSS)

### Dead Code
- `src/components/TraitGrid.tsx` — Old flat trait grid, replaced by TraitAccordion. Not imported anywhere.

## Local Development Setup

1. **Set up environment** (one-time):
   ```bash
   cp .env.local.example .env.local
   # Add your ANTHROPIC_API_KEY
   ```

2. **Install and run:**
   ```bash
   npm install
   npm run dev
   ```

App runs at `http://localhost:3000`. No database, no external services beyond the Anthropic API.

## Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

No test framework is configured. No Jest, Vitest, Playwright, or Cypress.

## Environment Variables

Required in `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

That's the only environment variable. No database, no Redis, no external services.

## Tech Stack

- **Framework:** Next.js 16 (App Router, `src/` directory)
- **React:** 19 with `'use client'` directives on all components
- **AI:** Vercel AI SDK v4 + `@ai-sdk/anthropic` → Claude Sonnet 4.6
- **Streaming:** `streamObject` / `useObject` + raw fetch with `partial-json`
- **Schemas:** Zod for both validation and AI SDK schema definitions
- **Styling:** Custom CSS in `globals.css` (Tailwind imported but NOT used for utilities)
- **Fonts:** Space Grotesk (display), Geist (sans), Geist Mono (mono)
- **TypeScript:** Strict mode, `@/*` path alias

## Coding Conventions

### CSS
- ALL styling in `src/app/globals.css` — plain CSS classes, NOT Tailwind utilities
- Section headers: `/* === SECTION NAME === */`
- Data attributes for state: `data-selected`, `data-verdict`, `data-expanded`, `data-phase`
- CSS custom properties for theming: `--mood-color`, `--background`, `--foreground`
- Single breakpoint: `@media (max-width: 768px)`

### Components
- Functional, `'use client'`, named exports (except `Game` which is default)
- Inline prop types: `({ prop }: { prop: Type })`
- No external state management — all state in `Game.tsx` via `useState`
- `useRef` mirrors for state values read inside debounced/async callbacks (stale closure prevention)

### API Routes
- All in `src/app/api/[name]/route.ts`
- All export `const runtime = 'nodejs'`
- All use `streamObject()` with Zod schemas
- All return `result.toTextStreamResponse()`
- POST-only, request body validated with Zod `safeParse()`

### Commits
- Conventional commits: `feat:`, `fix:` prefixes
- Single-line descriptive summaries

## Common Patterns

### Adding a New API Route

1. Create `src/app/api/[route-name]/route.ts`
2. Define Zod schema in `src/lib/schemas.ts`
3. Add system prompt in `src/lib/prompts.ts`
4. Use `streamObject()` with the schema and return `result.toTextStreamResponse()`
5. Export `const runtime = 'nodejs'`

### Adding a New Component

1. Create in `src/components/`
2. Add `'use client'` directive
3. Define inline prop types
4. Style with plain CSS classes in `globals.css`
5. Wire up in `Game.tsx` (all state flows from there)

### Styling a New Element

1. Add CSS to `globals.css` under the appropriate section header
2. Use CSS custom properties for mood-reactive colors: `var(--mood-color)`
3. Use `data-*` attributes for state-driven styling, not className toggling
4. Add `@media (max-width: 768px)` overrides if needed

### Hydration Safety

- `fieldLogNumber` initializes to fixed value (47), randomizes on mount via `useEffect`
- `hasInitialFetch` ref prevents double API calls in React StrictMode
- Avoid `Math.random()` or `Date.now()` in initial render

## Architecture Principles

1. **Single State Container**: All game state in `Game.tsx`. No state management libraries. Props flow down.
2. **Streaming-First**: Every AI interaction streams character-by-character. `partial-json` enables incremental UI updates before the full response arrives.
3. **Cancellable Micro-Judgments**: Trait selections abort in-flight judgments via `AbortController`. Only the latest selection matters.
4. **Scientist Memory**: The AI character builds on prior observations. Memory is client-side arrays passed back to the API, not server-side storage.
5. **Mood-Driven Atmosphere**: A single CSS custom property (`--mood-color`) cascades through the entire visual system. The scientist's emotion literally colors the UI.
6. **Instant UI, Streaming Data**: Fallback data renders immediately. Real data streams in and replaces it. The user never sees a loading spinner for the main game screen.
7. **No Database**: All state is ephemeral React state. Bestiary persists only for the browser session. This is intentional — the game is a contained experience.
