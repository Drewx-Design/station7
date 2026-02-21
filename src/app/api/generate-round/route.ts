import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { RoundSchema } from '@/lib/schemas'
import { GENERATE_ROUND_SYSTEM } from '@/lib/prompts'
import { SONNET_MODEL } from '@/lib/models'

export const runtime = 'nodejs'

export async function POST() {
  const result = streamObject({
    model: anthropic(SONNET_MODEL),
    schema: RoundSchema,
    system: GENERATE_ROUND_SYSTEM,
    prompt: 'Generate a fresh round: one scenario and a full pool of creature traits.',
    temperature: 0.9,
    onError({ error }) {
      console.error('[generate-round] Stream error:', error)
    },
  })

  return result.toTextStreamResponse()
}
