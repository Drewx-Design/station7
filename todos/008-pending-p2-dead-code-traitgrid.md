---
status: pending
priority: p2
issue_id: 8
tags: [code-review, dead-code]
---

# TraitGrid.tsx is entirely unused dead code

## Problem Statement
`TraitGrid.tsx` (79 lines) is never imported anywhere in the codebase. `Game.tsx` imports `TraitAccordion` exclusively (line 10). This file was the predecessor component and should have been removed when `TraitAccordion` replaced it. It duplicates the `Selections` type and `CATEGORY_LABELS` constant unnecessarily. **[Strong Signal -- 4 agents flagged independently]**

## Findings
- **Location:** `src/components/TraitGrid.tsx:1`
- **Confidence:** 1.00
- **Source Agents:** architecture, patterns, simplicity, typescript

## Stakeholder Impact
- **Developer:** Dead code creates confusion about which component is canonical. A new developer might modify TraitGrid.tsx thinking it is the active component. It also contributes to the Selections type duplication (finding #9).
- **Operations:** The file ships in the production bundle (though tree-shaking should eliminate it). No runtime impact, but it adds noise to code search results and git blame.

## Failure Scenarios
- **Accidental import:** A developer searches for 'TraitGrid' and imports it instead of TraitAccordion in a new file. The wrong component renders with no compile error since TraitGrid exports a valid React component with a compatible interface.

## Proposed Solutions

### Option A: Delete the file (primary)
Run `git rm src/components/TraitGrid.tsx` and remove any references in documentation. This is safe because zero files import it.

### Option B: Archive with deprecation notice
If the file has reference value, rename to `TraitGrid.tsx.bak` or move to a `_deprecated/` folder. Less clean but preserves the code for reference without risk of accidental import.

## Acceptance Criteria
- [ ] `src/components/TraitGrid.tsx` no longer exists in the repository
- [ ] No import references to TraitGrid remain in any file
- [ ] Application builds and runs correctly after removal
- [ ] git status shows the file as deleted (not just unstaged)

## Work Log
- 2026-02-21: Created from code review (full main branch review)
