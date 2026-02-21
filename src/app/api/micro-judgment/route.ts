import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { MicroJudgmentSchema, MicroJudgmentRequestSchema } from '@/lib/schemas'
import { MICRO_JUDGMENT_SYSTEM } from '@/lib/prompts'
import { SONNET_MODEL } from '@/lib/models'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = MicroJudgmentRequestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { scenario, selections, priorNotes, priorMoods, creatureCount } = parsed.data

  // Build the assessment prompt from current state
  const traitsDescription = Object.entries(selections)
    .filter(([, trait]) => trait !== null)
    .map(([category, trait]) =>
      `${category.toUpperCase()}: ${trait!.name} -- ${trait!.description}`
    )
    .join('\n')

  const traitCount = Object.values(selections).filter(t => t !== null).length

  // Build scientist memory context
  let memoryContext = ''
  if (priorNotes && priorNotes.length > 0) {
    memoryContext = `\n\nYOUR PRIOR OBSERVATIONS (you said these -- build on them, don't repeat):
${priorNotes.map((note: string, i: number) => `[Observation ${i + 1}] ${note}`).join('\n')}

YOUR EMOTIONAL TRAJECTORY SO FAR: ${priorMoods!.join(' -> ')}`
  }

  const prompt = `SCENARIO: ${scenario}

CURRENTLY SELECTED TRAITS (${traitCount} of 4):
${traitsDescription}${memoryContext}

Provide your updated assessment.`

  const system = creatureCount > 0
    ? `${MICRO_JUDGMENT_SYSTEM}\n\nCROSS-ROUND CONTEXT: You have catalogued ${creatureCount} specimen${creatureCount === 1 ? '' : 's'} before this one. You are not new to this. Let that experience inflect your tone -- weariness, pattern recognition, rising standards, or the creeping suspicion that the universe is testing you.`
    : MICRO_JUDGMENT_SYSTEM

  const result = streamObject({
    model: anthropic(SONNET_MODEL),
    schema: MicroJudgmentSchema,
    system,
    prompt,
    temperature: 0.8,
    onError({ error }) {
      console.error('[micro-judgment] Stream error:', error)
    },
  })

  return result.toTextStreamResponse()
}
