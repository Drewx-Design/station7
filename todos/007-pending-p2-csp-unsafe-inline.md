---
status: pending
priority: p2
issue_id: 7
tags: [code-review, security]
---

# CSP allows unsafe-inline and unsafe-eval, defeating XSS protection

## Problem Statement
The Content-Security-Policy header in `next.config.ts` includes `'unsafe-inline'` and `'unsafe-eval'` for `script-src`, and `'unsafe-inline'` for `style-src`. This effectively nullifies the CSP as a defense against XSS attacks, since injected inline scripts would be permitted to execute. The CSP is visibly present in the security headers (suggesting security intent) but configured in a way that negates its purpose. **[Strong Signal -- 5 agents flagged independently]**

## Findings
- **Location:** `next.config.ts:11`
- **Confidence:** 0.92
- **Source Agents:** architecture, patterns, security, simplicity, typescript

## Stakeholder Impact
- **Developer:** The CSP is configured in next.config.ts and applies globally. Next.js 16 requires `'unsafe-eval'` for development mode but not production. The `'unsafe-inline'` for style-src is needed because the codebase uses inline styles in error.tsx and CreatureCard.tsx. Moving to nonce-based CSP requires using Next.js's built-in nonce support, which involves changes to layout.tsx and middleware.
- **Operations:** The current CSP provides defense-in-depth headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) which are correctly configured. Only the CSP script-src directive is ineffective. Deploying a stricter CSP requires testing to ensure no third-party scripts or inline handlers break.

## Failure Scenarios
- **XSS via AI-generated content:** If a prompt injection causes the LLM to output HTML/script content that gets rendered unsafely, the CSP would not block it. React's JSX escaping prevents most XSS, but the CSP provides no backup defense.
- **Development vs production mismatch:** The same CSP applies to both dev and prod. `unsafe-eval` is only needed in dev for hot module replacement. Production gets an unnecessarily permissive CSP.

## Proposed Solutions

### Option A: Nonce-based CSP (primary)
Use Next.js nonce-based CSP. In middleware.ts, generate a nonce via `crypto.randomUUID()`, set it on the response header. In next.config.ts, use `'nonce-${nonce}'` instead of `'unsafe-inline'` for script-src. Keep `'unsafe-inline'` for style-src (needed for inline styles).

### Option B: Environment-conditional CSP
Split CSP configuration based on `NODE_ENV`. In production, remove `'unsafe-eval'` entirely and replace `'unsafe-inline'` with hash-based script allowlisting. In development, keep the permissive policy for HMR compatibility.

## Acceptance Criteria
- [ ] Production CSP does not include `'unsafe-eval'` in script-src
- [ ] Production CSP does not include `'unsafe-inline'` in script-src (replaced with nonce or hash)
- [ ] Development mode still works with HMR (may keep `'unsafe-eval'` for dev only)
- [ ] All pages render correctly with the tightened CSP
- [ ] Inline styles in CreatureCard and error.tsx still apply (style-src may retain `'unsafe-inline'`)

## Work Log
- 2026-02-21: Created from code review (full main branch review)
