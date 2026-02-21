---
status: pending
priority: p2
issue_id: 14
tags: [code-review, input-validation]
---

# Zod TraitSchema has no max length on name/description, enabling payload inflation

## Problem Statement
`TraitSchema` in `schemas.ts:5-8` uses `z.string()` with no `.max()` constraint for `name` and `description`. An attacker can send arbitrarily long strings in trait names/descriptions through the micro-judgment and brew endpoints, inflating token consumption in the Anthropic API and potentially causing excessive costs or timeouts. The `MicroJudgmentRequestSchema` and `BrewRequestSchema` already have `.max(10)` on array lengths and `.max(2000)` on scenario -- the gap is specifically on TraitSchema's string fields.

## Findings
- **Location:** `src/lib/schemas.ts:5`
- **Confidence:** 0.88
- **Source Agents:** security

## Stakeholder Impact
- **Developer:** The MicroJudgmentRequestSchema and BrewRequestSchema already have `.max(10)` on array lengths and `.max(2000)` on scenario. The gap is specifically on TraitSchema's string fields, which are used as values in the selections record. A one-line change per field.
- **Operations:** Without length limits, a single malicious brew request could send ~100KB of trait data, translating to ~25K+ input tokens billed to the Anthropic account. Combined with finding #5 (no auth), this amplifies the cost-per-request for an attacker.

## Failure Scenarios
- **Token inflation attack:** Attacker sends a brew request with 4 traits, each having a 50KB description field. ~200KB of user-controlled text inserted into the prompt. At Anthropic's pricing, this single request costs ~$0.60 in input tokens alone. Automated at 10 requests/second, cost is $360/minute.
- **LLM context window exhaustion:** Trait descriptions exceed the model's context window when combined with the system prompt and other context. The Anthropic API returns a 400 error (context length exceeded). The user sees a brew failure with no helpful error message.

## Proposed Solutions

### Option A: Add .max() constraints to TraitSchema (primary)
Update TraitSchema in `schemas.ts`:
```typescript
export const TraitSchema = z.object({
  name: z.string().max(100).describe('Trait name, 2-6 words'),
  description: z.string().max(500).describe('Max 10 words. One clause, no subject. Spec sheet voice.'),
})
```
Also add `.max(500)` to individual string items in priorNotes/priorMoods arrays:
```typescript
priorNotes: z.array(z.string().max(500)).max(10).optional().default([]),
priorMoods: z.array(z.string().max(100)).max(10).optional().default([]),
```

### Option B: Server-side request body size limit
Add a total request body size check in middleware.ts (e.g., reject bodies > 10KB). This is a coarser guard but catches all payload inflation vectors at once, not just trait fields.

## Acceptance Criteria
- [ ] `TraitSchema.name` has a `.max(100)` constraint
- [ ] `TraitSchema.description` has a `.max(500)` constraint
- [ ] `priorNotes` array strings have a `.max(500)` constraint
- [ ] `priorMoods` array strings have a `.max(100)` constraint
- [ ] API routes return 400 with a clear error when max lengths are exceeded
- [ ] Normal game payloads (AI-generated traits with short names/descriptions) are unaffected

## Work Log
- 2026-02-21: Created from code review (full main branch review)
