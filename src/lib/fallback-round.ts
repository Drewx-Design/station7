import type { Round } from './schemas'

export const FALLBACK_ROUND: Round = {
  scenario: "Your creature must teach a kindergarten class for one hour without any preparation.",
  traits: {
    form: [
      { name: "Gelatinous Cube", description: "3ft translucent mass, faint linoleum trail." },
      { name: "Sentient Fog", description: "Ankle-height, vaguely purposeful, difficult to count." },
      { name: "Swarm of Tiny Moths", description: "200 moths, single consciousness, directional disagreements." },
    ],
    feature: [
      { name: "Covered in Soft Luminous Moss", description: "Faint green glow, rain smell, irresistible to children." },
      { name: "Twelve Tiny Legs in a Circle", description: "Carousel locomotion, surprisingly fast, hypnotic." },
      { name: "One Enormous Eye", description: "Unblinking, photographic memory, unsettling eye contact." },
    ],
    ability: [
      { name: "PhD in Economics", description: "Defended thesis, cannot explain how, mutters about supply." },
      { name: "Can Taste Emotions", description: "Joy is sweet, boredom is cardboard, kindergartens: chaos." },
      { name: "Perfect Vocal Mimic", description: "Any sound, any language, no original thoughts vocally." },
    ],
    flaw: [
      { name: "Falls Asleep When Complimented", description: "Mild praise triggers unconsciousness, snores gently." },
      { name: "Deathly Afraid of the Color Blue", description: "Sky: nightmare. Jeans: war crime. Crayons: hostile." },
      { name: "Cannot Stop Narrating in Third Person", description: "Loudly, always, increasingly dramatic phrasing." },
    ],
  },
}
