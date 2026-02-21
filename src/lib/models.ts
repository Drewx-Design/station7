// VERIFY AT HACKATHON START:
// curl https://api.anthropic.com/v1/models -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01"
export const SONNET_MODEL = 'claude-sonnet-4-6'          // Confirmed Feb 17, 2026
export const BREW_MODEL = 'claude-sonnet-4-6'            // Start with Sonnet; switch to 'claude-opus-4-6' if quality insufficient
// Fallback if Sonnet 4.6 has issues: 'claude-sonnet-4-5-20250929' (NOT 20250514)
