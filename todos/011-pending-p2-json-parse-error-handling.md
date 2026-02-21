---
status: pending
priority: p2
issue_id: 11
tags: [code-review, error-handling]
---

# API routes do not validate req.json() parse failures

## Problem Statement
Both `brew/route.ts` and `micro-judgment/route.ts` call `await req.json()` (line 10 in each) without try/catch. If the request body is not valid JSON (e.g., empty body, malformed payload, truncated network request), this throws an unhandled `SyntaxError` that surfaces as a generic 500 rather than a structured 400 response. The Zod `safeParse` on the next line handles structurally valid but semantically invalid JSON -- the gap is specifically for non-JSON payloads.

## Findings
- **Location:** `src/app/api/brew/route.ts:10`
- **Confidence:** 0.90
- **Source Agents:** performance, typescript

## Stakeholder Impact
- **Developer:** The Zod safeParse on the next line handles structurally valid but semantically invalid JSON. The gap is specifically for non-JSON payloads (empty body, truncated request, wrong content-type). Adding try/catch is a 4-line change per route.
- **Operations:** Unhandled JSON parse errors surface as 500s in Vercel's function logs, polluting error monitoring with client-caused errors. A 400 response would correctly attribute the error to the caller.

## Failure Scenarios
- **Empty body POST:** Client sends POST with no body or Content-Type header (e.g., a misconfigured fetch call or network middleware stripping the body). `req.json()` throws SyntaxError. Next.js returns a 500 instead of a 400. The Zod validation never runs.
- **Truncated network request:** Network interruption causes a partial JSON body to arrive at the server. `req.json()` throws SyntaxError on the malformed JSON. Server returns 500 instead of 400.

## Proposed Solutions

### Option A: Try/catch wrapper (primary)
Wrap the JSON parse in both routes:
```typescript
let body;
try {
  body = await req.json()
} catch {
  return new Response(
    JSON.stringify({ error: 'Invalid JSON' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  )
}
```
Apply to both `brew/route.ts:10` and `micro-judgment/route.ts:10`.

### Option B: Shared utility function
Create a `parseRequestBody` helper in a shared utils file that wraps `req.json()` with error handling and returns a discriminated union (`{ ok: true, data } | { ok: false, response }`). This avoids duplicating the try/catch pattern across all three API routes.

## Acceptance Criteria
- [ ] `brew/route.ts` returns 400 with `{ error: 'Invalid JSON' }` when body is not valid JSON
- [ ] `micro-judgment/route.ts` returns 400 with `{ error: 'Invalid JSON' }` when body is not valid JSON
- [ ] Empty body POST requests receive 400, not 500
- [ ] Truncated/malformed JSON body requests receive 400, not 500
- [ ] Valid JSON bodies continue to work as before (Zod validation still runs)

## Work Log
- 2026-02-21: Created from code review (full main branch review)
