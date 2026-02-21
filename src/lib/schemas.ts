import { z } from 'zod'

// === Shared Types ===

export const TraitSchema = z.object({
  name: z.string().describe('Trait name, 2-6 words'),
  description: z.string().describe('Max 10 words. One clause, no subject. Spec sheet voice.'),
})

export type Trait = z.infer<typeof TraitSchema>

// === Generate Round ===

export const RoundSchema = z.object({
  scenario: z.string().describe('The absurd human scenario the creature must survive'),
  traits: z.object({
    form: z.array(TraitSchema).describe('6 core body/shape/material traits'),
    feature: z.array(TraitSchema).describe('6 physical detail/appendage traits'),
    ability: z.array(TraitSchema).describe('6 mental/sensory/supernatural traits'),
    flaw: z.array(TraitSchema).describe('4 mandatory weakness traits'),
  }),
})

export type Round = z.infer<typeof RoundSchema>

// === Micro-Judgment ===

export const MicroJudgmentSchema = z.object({
  lab_mood: z.string().describe('Emotional state slug: fascinated, concerned, delighted, horrified, resigned, etc.'),
  color: z.string().describe('Hex color reflecting creature viability. Greens=viable, teals=uncertain, blues=doomed, golds=triumphant'),
  reading: z.string().describe('ALL-CAPS instrument readout, e.g. "BIOLOGICAL COHERENCE: 67% | SCENARIO VIABILITY: UNCERTAIN"'),
  scientist_note: z.string().describe('MAXIMUM 2 sentences. One observation, one theory revision. Field journal register, plain text, no markdown or asterisks.'),
})

export type MicroJudgment = z.infer<typeof MicroJudgmentSchema>

// === Scientist History (client-side accumulation, passed as context to micro-judgment + brew) ===

export const ScientistHistorySchema = z.object({
  notes: z.array(z.string()),
  moods: z.array(z.string()),
})

export type ScientistHistory = z.infer<typeof ScientistHistorySchema>

// === Brew / Creature ===

export const CreatureSchema = z.object({
  name: z.string().describe('Creature name with epithet, e.g. "Gelathrax the Reluctant"'),
  species: z.string().describe('Fake taxonomic classification with parenthetical, e.g. "Mucoid Narcoleptic (Tenured)"'),
  description: z.string().describe('One sentence combining all four traits'),
  viability_score: z.number().describe('Integer 0-100. MUST be between 0 and 100. 0-29 catastrophic, 30-69 mediocre, 70-100 triumphant'),
  verdict: z.enum(['triumphant', 'mediocre', 'catastrophic']),
  narrative: z.string().describe('3-5 sentences: the creature attempts the scenario. Field report tone. Builds to the epitaph.'),
  epitaph: z.string().describe('1-2 sentences. Current status. The screenshot moment. Lands like a punchline, reads like a clinical note.'),
  personality: z.string().describe('One word: the creature dominant emotional state'),
  color_palette: z.array(z.string()).describe('Three hex colors representing the creature vibe. Exactly 3 colors.'),
})

export type Creature = z.infer<typeof CreatureSchema>

// === API Request Body Schemas (server-side validation) ===

export const MicroJudgmentRequestSchema = z.object({
  scenario: z.string().min(1).max(2000),
  selections: z.record(z.string(), TraitSchema.nullable()),
  priorNotes: z.array(z.string()).max(10).optional().default([]),
  priorMoods: z.array(z.string()).max(10).optional().default([]),
})

export const BrewRequestSchema = z.object({
  scenario: z.string().min(1).max(2000),
  selections: z.record(z.string(), TraitSchema),
  accumulatedNotes: z.array(z.string()).max(10).optional().default([]),
  moodTrajectory: z.array(z.string()).max(10).optional().default([]),
})
