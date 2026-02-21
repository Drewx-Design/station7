---
status: pending
priority: p1
issue_id: 1
tags: [code-review, reliability, serverless, security]
---

# In-memory rate limiter is ineffective on serverless/edge deployments

## Problem Statement
**[Strong Signal -- 6 agents flagged independently]**

The rate limiter in `middleware.ts` stores request hits in a plain `Map()` at module scope (line 7). On Vercel's serverless infrastructure, each function invocation may cold-start with an empty Map, and concurrent instances each maintain isolated memory. The 30-request cap defined at line 5 is therefore per-instance, not per-user. This provides false security -- the code reads as a working rate limiter but offers zero real protection in production.

The cleanup function (lines 11-23) only runs if the last cleanup was more than 60 seconds ago, but never fully purges if new IPs keep arriving, allowing unbounded Map growth in long-lived dev instances. Additionally, the IP identification at line 26 uses `x-forwarded-for`, which is trivially spoofable.

## Findings
- **Location:** `src/middleware.ts:7`
- **Confidence:** 0.95
- **Source Agents:** architecture, patterns, performance, security, simplicity, typescript
- **Impact:** Rate limiter provides zero real protection on Vercel. Unbounded Map growth risks OOM in long-lived dev instances.

## Stakeholder Impact

**Developer:** The code reads as a standard rate limiter and gives false confidence. A developer maintaining this would reasonably assume API abuse protection is handled, making it harder to diagnose cost spikes or abuse incidents. The Map-based approach also leaks memory in long-lived dev instances since cleanup only runs once per WINDOW_MS.

**Operations:** No observability exists -- there are no logs when rate limits fire, no metrics on hit counts, and no way to know whether the limiter is actually stopping anything. Deploying to Vercel means each cold start resets all state, so production monitoring would show zero rate limit events even under active abuse.

**End User:** End users are unaffected under normal use. However, if an attacker drains the Anthropic API budget, all users experience degraded service or outright failures with no clear error messaging beyond generic 500s from the Anthropic SDK.

**Security:** This is the only defense between the public internet and three Anthropic API endpoints. With each serverless instance holding independent state and cold starts resetting everything, an attacker can trivially bypass the limit by distributing requests across multiple connections. The x-forwarded-for header used for IP identification is also trivially spoofable.

**Business:** Direct cost exposure: Anthropic API calls cost real money, and an unbounded attacker can rack up charges proportional to the time before someone notices. For a POC/game this may be acceptable, but any public deployment without a real limiter risks unexpected bills.

## Failure Scenarios
1. **Cold start bypass:** Attacker sends requests at a steady rate. Vercel scales up new instances under load, each starting with an empty Map. Rate limit is never hit -- unlimited Anthropic tokens consumed.
2. **IP spoofing bypass:** Attacker rotates the `x-forwarded-for` header on each request. Each request appears as a new IP. Memory grows linearly with attack volume.
3. **Memory exhaustion in dev:** Long-running local dev server with sustained traffic. Cleanup only fires if last cleanup was >60s ago but never fully purges. Map grows unboundedly until OOM.
4. **Multi-instance isolation:** Normal production traffic distributed across N Vercel function instances. A single user can make 30 * N requests.

## Proposed Solutions

### Option A: Upstash Redis rate limiting (recommended)
Replace the in-memory Map with Upstash Redis via `@upstash/ratelimit`:
```ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, '60 s'),
})
```
Then in middleware: `const { success } = await ratelimit.limit(ip)`
- **Pros:** Durable across cold starts and instances. Proven library. Sliding window is more fair than fixed window.
- **Cons:** Adds a dependency and requires Upstash account/env vars. ~$0.20/100K commands.
- **Effort:** Medium

### Option B: Vercel's built-in rate limiting
Use Vercel's native WAF/rate limiting features if on a Pro or Enterprise plan.
- **Pros:** Zero code changes, managed at infrastructure level.
- **Cons:** Requires Vercel Pro plan. Less granular control.
- **Effort:** Small (configuration only)

### Option C: Document as dev-only and add Anthropic spending cap
Keep the current implementation but: (1) add a clear comment that it's dev-only, (2) set a hard spending cap on the Anthropic dashboard, (3) add logging when limits fire.
- **Pros:** Zero cost, zero new dependencies. Honest about its limitations.
- **Cons:** Does not actually solve the problem -- just documents it. Still vulnerable on any public deploy.
- **Effort:** Small

## Acceptance Criteria
- [ ] Rate limiting persists across cold starts and serverless instances
- [ ] IP identification is robust (not solely reliant on spoofable headers)
- [ ] Rate limit events are logged for observability
- [ ] Memory usage is bounded regardless of traffic volume
- [ ] 429 responses include appropriate Retry-After headers
- [ ] Existing API routes continue to function normally under the new limiter

## Work Log
- 2026-02-21: Created from code review (full main branch review)
