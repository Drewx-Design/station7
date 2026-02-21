import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { MicroJudgmentSchema, MicroJudgmentRequestSchema } from '@/lib/schemas'
import { MICRO_JUDGMENT_SYSTEM } from '@/lib/prompts'
import { SONNET_MODEL } from '@/lib/models'
import { sanitizePromptInput, sanitizeArray } from '@/lib/sanitize'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }
  const parsed = MicroJudgmentRequestSchema.safeParse(body)
  if (!parsed.success) {
    console.error('[micro-judgment] Validation failed:', parsed.error.issues)
    return new Response(JSON.stringify({ error: 'Invalid request body', issues: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { scenario, selections, priorNotes, priorMoods, creatureCount, interruptionCount } = parsed.data

  // Sanitize all user-controlled strings before prompt interpolation
  const safeScenario = sanitizePromptInput(scenario, 2000)
  const safePriorNotes = sanitizeArray(priorNotes ?? [])
  const safePriorMoods = sanitizeArray(priorMoods ?? [], 100)

  // Build the assessment prompt from current state
  const traitsDescription = Object.entries(selections)
    .filter(([, trait]) => trait !== null)
    .map(([category, trait]) =>
      `${category.toUpperCase()}: ${sanitizePromptInput(trait!.name, 100)} -- ${sanitizePromptInput(trait!.description, 500)}`
    )
    .join('\n')

  const traitCount = Object.values(selections).filter(t => t !== null).length

  // Build scientist memory context
  let memoryContext = ''
  if (safePriorNotes.length > 0) {
    memoryContext = `\n\nYOUR PRIOR OBSERVATIONS (you said these -- build on them, don't repeat):
${safePriorNotes.map((note: string, i: number) =>
  `[Observation ${i + 1}] ${note}`
).join('\n')}

YOUR EMOTIONAL TRAJECTORY SO FAR: ${safePriorMoods.join(' -> ')}`
  }

  const prompt = `SCENARIO: ${safeScenario}

CURRENTLY SELECTED TRAITS (${traitCount} of 4):
${traitsDescription}${memoryContext}

Provide your updated assessment.`

  let system = creatureCount > 0
    ? `${MICRO_JUDGMENT_SYSTEM}\n\nCROSS-ROUND CONTEXT: You have catalogued ${creatureCount} specimen${creatureCount === 1 ? '' : 's'} before this one. You are not new to this. Let that experience inflect your tone -- weariness, pattern recognition, rising standards, or the creeping suspicion that the universe is testing you.`
    : MICRO_JUDGMENT_SYSTEM

  if (interruptionCount > 0) {
    const interruptionFlavor = interruptionCount === 1
      ? `The subject changed their selection while you were mid-sentence. Your train of thought derailed. You are pretending it didn't bother you.`
      : interruptionCount === 2
      ? `The subject has now changed their mind ${interruptionCount} times while you were trying to think. Your notes have a crossed-out section. You are keeping your composure, but your handwriting is getting smaller.`
      : interruptionCount === 3
      ? `${interruptionCount} interruptions. You have stopped starting sentences with confidence. Your pen has left a dent in the clipboard. The professional mask is slipping and you are aware of it.`
      : `${interruptionCount} interruptions. You have lost count. You are no longer sure which observation belongs to which version of this creature. Your field journal has margin notes that just say "again." You are speaking to yourself more than to the record.`
    system += `\n\nINTERRUPTION CONTEXT: ${interruptionFlavor}`
  }

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
