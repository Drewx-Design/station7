import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { CreatureSchema, BrewRequestSchema } from '@/lib/schemas'
import { BREW_SYSTEM } from '@/lib/prompts'
import { BREW_MODEL } from '@/lib/models'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = BrewRequestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { scenario, selections, accumulatedNotes, moodTrajectory } = parsed.data

  const traitsDescription = Object.entries(selections)
    .map(([category, trait]) =>
      `${category.toUpperCase()}: ${trait.name} -- ${trait.description}`
    )
    .join('\n')

  // Mood trajectory context
  const moodContext = moodTrajectory.length > 0
    ? `YOUR EMOTIONAL TRAJECTORY DURING THE DRAFT PHASE: ${moodTrajectory.join(' -> ')}
YOU ARRIVED AT: ${moodTrajectory[moodTrajectory.length - 1]}`
    : 'No prior observations available -- this is a fresh assessment.'

  // Cap accumulated notes to prevent token cost inflation (max 6 notes = realistic max per round)
  const cappedNotes = accumulatedNotes.slice(-6)
  const notesContext = cappedNotes.length > 0
    ? `YOUR ACCUMULATED FIELD NOTES FROM THE DRAFT PHASE:
${cappedNotes.map((note: string, i: number) => `[Observation ${i + 1}] ${note}`).join('\n\n')}`
    : ''

  const prompt = `SCENARIO: ${scenario}

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
