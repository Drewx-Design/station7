---
status: pending
priority: p1
issue_id: 5
tags: [code-review, security, api, authentication]
---

# API routes expose Anthropic key with no authentication or authorization

## Problem Statement
All three POST endpoints are publicly callable with zero authentication:
- `src/app/api/generate-round/route.ts` -- accepts an empty POST (no body required, line 9)
- `src/app/api/micro-judgment/route.ts` -- accepts POST with Zod-validated body (line 10)
- `src/app/api/brew/route.ts` -- accepts POST with Zod-validated body (line 10)

Any client can invoke these directly via curl or scripting to consume the Anthropic API key budget. The only guard is the in-memory rate limiter (finding #1) which resets on cold start and does not survive multi-instance Vercel deployments. The `generate-round` endpoint is the cheapest attack vector since it requires no request body at all.

The Zod schemas validate request structure but not authorization. There is no session token, CSRF token, cookie check, or any other mechanism to verify that requests originate from the game UI.

## Findings
- **Location:** `src/app/api/generate-round/route.ts:9`
- **Confidence:** 0.95
- **Source Agents:** architecture
- **Impact:** Any internet user can call API routes directly, burning Anthropic budget with zero friction. Immediate cost exposure on public deploy.

## Stakeholder Impact

**Developer:** The API routes are clean and well-structured with Zod validation, but have no auth layer. Adding authentication later is straightforward (middleware or per-route check) but requires choosing an auth strategy. The Zod validation on request bodies prevents malformed payloads but not unauthorized access.

**Operations:** No way to distinguish legitimate game traffic from abuse in server logs. The Anthropic API key is the only secret, and its usage is unbounded. If deployed publicly, the only signal of abuse would be the Anthropic billing dashboard, which may lag behind real-time usage.

**End User:** No impact under normal use. If an attacker drains the API budget, all users lose access to the game's core functionality (round generation, micro-judgments, brewing) with no helpful error message -- just generic failures.

**Security:** Three publicly accessible POST endpoints that each make paid API calls to Anthropic. The generate-round endpoint is the cheapest attack vector (no body required). An attacker can automate calls with curl in a loop. Combined with finding #1 (ineffective rate limiter), there is zero effective protection.

**Business:** Direct financial risk. Anthropic Claude Sonnet pricing means a sustained attack generating rounds could cost $10-50/hour. Without spending caps on the Anthropic account, the exposure is unlimited.

## Failure Scenarios
1. **Automated budget drain via generate-round:** Attacker scripts `curl -X POST https://station7.vercel.app/api/generate-round` in a loop. Each call generates a full round (~2K output tokens). At 100 requests/minute, cost is ~$2.70/hour continuously.
2. **Token inflation via brew endpoint:** Attacker sends brew requests with maximum-length accumulatedNotes (10 strings at max length) and long trait descriptions. Each brew call consumes ~5K+ input tokens plus ~2K output tokens.
3. **Prompt exfiltration:** Attacker sends crafted trait names/descriptions designed to make the LLM echo its system prompt. The 130+ lines of game design prompts are leaked.
4. **Denial of service via Anthropic rate limits:** Attacker makes enough concurrent requests to hit Anthropic's own rate limits on the API key. Legitimate users receive 429 errors. The game becomes unplayable for everyone.

## Proposed Solutions

### Option A: Signed session cookie (recommended)
In `layout.tsx`, set a signed HttpOnly cookie on first visit. In `middleware.ts`, verify the cookie exists and has a valid signature before allowing API access:
```ts
import { subtle } from 'crypto'
// In layout or middleware: set cookie with HMAC signature
// In API guard: verify HMAC before processing request
```
- **Pros:** Prevents automated curl-based attacks without requiring user accounts. No client-side JS changes needed. Transparent to legitimate users.
- **Cons:** Does not prevent abuse from someone who captures the cookie from a real browser session. Requires a server-side secret (env var).
- **Effort:** Medium (1-2 hours)

### Option B: CSRF token per page load
Generate a CSRF token in the page component and include it in all API requests. Validate it server-side.
- **Pros:** Standard web security pattern. Prevents cross-site request forgery as well as direct API abuse.
- **Cons:** Requires client-side changes to include the token in every fetch call. Adds complexity to the streaming setup.
- **Effort:** Medium (2 hours)

### Option C: Anthropic spending cap + rate limiter fix
Set a hard spending cap on the Anthropic dashboard and fix the rate limiter (finding #1). Accept that the APIs are public but limit the blast radius.
- **Pros:** Simplest approach. No auth code to maintain. The spending cap is the ultimate backstop regardless of what other protections exist.
- **Cons:** Does not prevent abuse, only limits its cost. An attacker can still burn through the cap. Should be done in addition to auth, not instead of it.
- **Effort:** Small (30 minutes for cap, medium for rate limiter)

## Acceptance Criteria
- [ ] API routes reject requests that do not originate from the game application
- [ ] Automated curl/script-based attacks are blocked
- [ ] Legitimate game UI requests continue to work without user-visible changes
- [ ] Failed auth attempts return a clear 401/403 response (not 500)
- [ ] Anthropic spending cap is set as a defense-in-depth measure regardless of auth strategy
- [ ] Auth mechanism does not interfere with the streaming response format

## Work Log
- 2026-02-21: Created from code review (full main branch review)
