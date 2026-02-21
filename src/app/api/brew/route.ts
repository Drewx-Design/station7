import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { CreatureSchema, BrewRequestSchema } from '@/lib/schemas'
import { BREW_SYSTEM } from '@/lib/prompts'
import { BREW_MODEL } from '@/lib/models'
import { sanitizePromptInput, sanitizeArray } from '@/lib/sanitize'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }
  const parsed = BrewRequestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { scenario, selections, accumulatedNotes, moodTrajectory } = parsed.data

  // Sanitize all user-controlled strings before prompt interpolation
  const safeScenario = sanitizePromptInput(scenario, 2000)
  const safeMoods = sanitizeArray(moodTrajectory ?? [], 100)

  const traitsDescription = Object.entries(selections)
    .map(([category, trait]) =>
      `${category.toUpperCase()}: ${sanitizePromptInput(trait.name, 100)} -- ${sanitizePromptInput(trait.description, 500)}`
    )
    .join('\n')

  // Mood trajectory context
  const moodContext = safeMoods.length > 0
    ? `YOUR EMOTIONAL TRAJECTORY DURING THE DRAFT PHASE: ${safeMoods.join(' -> ')}
YOU ARRIVED AT: ${safeMoods[safeMoods.length - 1]}`
    : 'No prior observations available -- this is a fresh assessment.'

  // Cap accumulated notes to prevent token cost inflation (max 6 notes = realistic max per round)
  const safeNotes = sanitizeArray(accumulatedNotes ?? [])
  const cappedNotes = safeNotes.slice(-6)
  const notesContext = cappedNotes.length > 0
    ? `YOUR ACCUMULATED FIELD NOTES FROM THE DRAFT PHASE:
(These notes were written under real-time observation pressure. Fragments and interrupted thoughts are intentional -- extract what you can.)
${cappedNotes.map((note: string, i: number) => `[Observation ${i + 1}] ${note}`).join('\n\n')}`
    : ''

  const prompt = `SCENARIO: ${safeScenario}

CREATURE TRAITS:
${traitsDescription}

${moodContext}

${notesContext}

Synthesize the complete specimen record. Determine the viability score first, then write everything else in a tone that matches the verdict.`

  const result = streamObject({
    model: anthropic(BREW_MODEL),
    schema: CreatureSchema,
    system: BREW_SYSTEM,
    prompt,
    temperature: 0.9,
    onError({ error }) {
      console.error('[brew] Stream error:', error)
    },
  })

  return result.toTextStreamResponse()
}
