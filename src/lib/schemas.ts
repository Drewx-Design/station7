import { z } from 'zod'

// === Shared Types ===

export const TraitSchema = z.object({
  name: z.string().max(100).describe('Trait name, 2-6 words'),
  description: z.string().max(500).describe('Max 10 words. One clause, no subject. Spec sheet voice.'),
})

export type Trait = z.infer<typeof TraitSchema>

// === Shared UI Types ===

export type Selections = {
  form: Trait | null
  feature: Trait | null
  ability: Trait | null
  flaw: Trait | null
}

// === Generate Round ===

export const RoundSchema = z.object({
  scenario: z.string().describe('The absurd human scenario the creature must survive'),
  traits: z.object({
    form: z.array(TraitSchema).describe('3 core body/shape/material traits'),
    feature: z.array(TraitSchema).describe('3 physical detail/appendage traits'),
    ability: z.array(TraitSchema).describe('3 mental/sensory/supernatural traits'),
    flaw: z.array(TraitSchema).describe('3 mandatory weakness traits'),
  }),
})

export type Round = z.infer<typeof RoundSchema>

// === Micro-Judgment ===

export const MicroJudgmentSchema = z.object({
  lab_mood: z.string().describe('Emotional state slug: fascinated, concerned, delighted, horrified, resigned, etc.'),
  mood_intensity: z.number().int().min(0).max(100).describe(
    'Intensity of current emotional state. 0 = barely perceptible, 100 = completely overwhelmed. Generally starts moderate (40-60) on first selection and escalates or plummets as conviction builds.'
  ),
  motion_state: z.enum(['agitated', 'curious', 'resolved']).describe(
    'Energy level of the lab atmosphere. agitated = alarmed/fascinated/horrified (fast, chaotic). curious = intrigued/uncertain/analyzing (medium, searching). resolved = satisfied/resigned/triumphant (slow, settled).'
  ),
  orb_colors: z.array(z.string()).min(2).max(3).describe(
    '2-3 hex colors (#RRGGBB) for background atmosphere orbs. First color is primary mood. Second is complementary or contrasting. Optional third adds depth. Greens/ambers for viable, teals/purples for uncertain, deep blues for doomed, warm golds for triumphant.'
  ),
  reading: z.string().describe('ALL-CAPS instrument readout, e.g. "BIOLOGICAL COHERENCE: 67% | SCENARIO VIABILITY: UNCERTAIN"'),
  scientist_note: z.string().describe('MAXIMUM 2 thoughts, complete or not. Fragments and abandoned clauses are expected. Field journal register, plain text, no markdown or asterisks.'),
})

export type MicroJudgment = z.infer<typeof MicroJudgmentSchema>
export type MotionState = MicroJudgment['motion_state']

// === Note Entry (client-side only — interrupted flag is for display, not API) ===

export type NoteEntry = { text: string; interrupted: boolean }

// === Brew / Creature ===

export const CreatureSchema = z.object({
  name: z.string().describe('Creature name with epithet, e.g. "Gelathrax the Reluctant"'),
  species: z.string().describe('Fake taxonomic classification with parenthetical, e.g. "Mucoid Narcoleptic (Tenured)"'),
  description: z.string().describe('Maximum 12 words combining all four traits. Spec sheet, not prose.'),
  viability_score: z.number().describe('Integer 0-100. MUST be between 0 and 100. 0-29 catastrophic, 30-69 marginal, 70-100 triumphant'),
  verdict: z.enum(['triumphant', 'marginal', 'catastrophic']),
  narrative: z.string().describe('Maximum 3 sentences: the creature attempts the scenario. Field report tone. Builds to the epitaph.'),
  epitaph: z.string().describe('1-2 sentences. Current status. The screenshot moment. Lands like a punchline, reads like a clinical note.'),
  personality: z.string().describe('One word: the creature dominant emotional state'),
  color_palette: z.array(z.string()).describe('Three hex colors representing the creature vibe. Exactly 3 colors.'),
  image_prompt: z.string().optional().describe('Vivid visual description for an AI image generator. Include creature form, features, emotional state, environment, and color palette tones.'),
})

export type Creature = z.infer<typeof CreatureSchema>

// === Bestiary Entry (client-side only — bundles creature with display context) ===

export type BestiaryEntry = {
  creature: Creature
  imageUrl: string | null
  selections: Selections
  fieldLogNumber: number
  scenario: string
}

// === API Request Body Schemas (server-side validation) ===

export const MicroJudgmentRequestSchema = z.object({
  scenario: z.string().min(1).max(2000),
  selections: z.record(z.string(), TraitSchema.nullable()),
  priorNotes: z.array(z.string().max(2000)).max(20).optional().default([]),
  priorMoods: z.array(z.string().max(200)).max(20).optional().default([]),
  creatureCount: z.number().int().min(0).max(1000).optional().default(0),
  interruptionCount: z.number().int().min(0).max(20).optional().default(0),
})

export const BrewRequestSchema = z.object({
  scenario: z.string().min(1).max(2000),
  selections: z.record(z.string(), TraitSchema),
  accumulatedNotes: z.array(z.string().max(2000)).max(20).optional().default([]),
  moodTrajectory: z.array(z.string().max(200)).max(20).optional().default([]),
})

// === Image Generation ===

export const ImageRequestSchema = z.object({
  image_prompt: z.string().min(1).max(2000),
  color_palette: z.array(z.string()).length(3),
  verdict: z.enum(['triumphant', 'marginal', 'catastrophic']),
})
