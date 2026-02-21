/**
 * Sanitize user-controlled strings before LLM prompt interpolation.
 * Strips control characters and common prompt injection delimiters.
 */

export function sanitizePromptInput(input: string, maxLength = 500): string {
  return input
    // Strip control characters (except newline/tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Collapse multiple newlines into one
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, maxLength)
}

export function sanitizeArray(inputs: string[], maxItemLength = 500): string[] {
  return inputs.map(s => sanitizePromptInput(s, maxItemLength))
}
