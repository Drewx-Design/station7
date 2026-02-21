import type { Round } from './schemas'

export const FALLBACK_ROUND: Round = {
  scenario: "Your creature must teach a kindergarten class for one hour without any preparation.",
  traits: {
    form: [
      { name: "Gelatinous Cube", description: "3ft translucent mass, faint linoleum trail." },
      { name: "Sentient Fog", description: "Ankle-height, vaguely purposeful, difficult to count." },
      { name: "Swarm of Tiny Moths", description: "200 moths, single consciousness, directional disagreements." },
      { name: "All Teeth", description: "No body plan, teeth in a sphere, excellent dental." },
      { name: "Looks Like an Accountant Named Steve", description: "Unsettlingly human, khakis included, empty briefcase." },
      { name: "Armored Sphere", description: "Rolls everywhere, no incline braking, good acoustics." },
    ],
    feature: [
      { name: "Covered in Soft Luminous Moss", description: "Faint green glow, rain smell, irresistible to children." },
      { name: "Twelve Tiny Legs in a Circle", description: "Carousel locomotion, surprisingly fast, hypnotic." },
      { name: "One Enormous Eye", description: "Unblinking, photographic memory, unsettling eye contact." },
      { name: "Translucent Skin Showing All Organs", description: "Anatomically educational, socially catastrophic." },
      { name: "Retractable Bone Spikes", description: "Threatening in theory, mostly opens packages." },
      { name: "Wings Made of Paper", description: "Functional in dry weather, existential in humidity." },
    ],
    ability: [
      { name: "PhD in Economics", description: "Defended thesis, cannot explain how, mutters about supply." },
      { name: "Can Taste Emotions", description: "Joy is sweet, boredom is cardboard, kindergartens: chaos." },
      { name: "Perfect Vocal Mimic", description: "Any sound, any language, no original thoughts vocally." },
      { name: "Turns Invisible When No One is Looking", description: "Technically always invisible, philosophically frustrated." },
      { name: "Secretes a Calming Pheromone", description: "10ft radius, 15% too friendly, long handshakes." },
      { name: "Generates Elevator Music Aura", description: "Continuous, non-optional, induces compliance." },
    ],
    flaw: [
      { name: "Falls Asleep When Complimented", description: "Mild praise triggers unconsciousness, snores gently." },
      { name: "Deathly Afraid of the Color Blue", description: "Sky: nightmare. Jeans: war crime. Crayons: hostile." },
      { name: "Cannot Stop Narrating in Third Person", description: "Loudly, always, increasingly dramatic phrasing." },
      { name: "Melts Slightly Above 72 Degrees", description: "Structural integrity weather-dependent, carries thermometer." },
    ],
  },
}
