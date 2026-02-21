import type { Round } from './schemas'

export const FALLBACK_ROUND: Round = {
  scenario: "Your creature must teach a kindergarten class for one hour without any preparation.",
  traits: {
    form: [
      { name: "Gelatinous Cube", description: "3ft translucent mass, surprisingly buoyant, leaves a faint trail on linoleum" },
      { name: "Sentient Fog", description: "Diffuse, ankle-height, vaguely purposeful, difficult to take attendance" },
      { name: "Swarm of Tiny Moths", description: "200 moths acting as a single consciousness, prone to disagreements about direction" },
      { name: "All Teeth", description: "No discernible body plan, just teeth arranged in a sphere, excellent dental record" },
      { name: "Looks Like a Middle-Aged Accountant Named Steve", description: "Unsettlingly human, khakis included, carries a briefcase that contains nothing" },
      { name: "Armored Sphere", description: "Rolls everywhere, cannot stop on inclines, surprisingly good acoustics inside" },
    ],
    feature: [
      { name: "Covered in Soft Luminous Moss", description: "Glows faintly green, smells like rain, children will touch it" },
      { name: "Twelve Tiny Legs in a Circle", description: "Moves like a carousel, surprisingly fast, hypnotic to watch" },
      { name: "One Enormous Eye", description: "Unblinking, photographic memory, deeply unsettling to make eye contact with" },
      { name: "Translucent Skin Showing All Organs", description: "Anatomically educational, socially challenging, impossible to lie" },
      { name: "Retractable Bone Spikes", description: "Threatening in theory, mostly used for opening packages and scratching backs" },
      { name: "Wings Made of Paper", description: "Functional in dry weather, existential crisis in humidity, rustles constantly" },
    ],
    ability: [
      { name: "PhD in Economics", description: "Defended thesis, cannot explain how, occasionally mutters about supply curves" },
      { name: "Can Taste Emotions", description: "Joy is sweet, anxiety is sour, boredom is cardboard, kindergartens taste like chaos" },
      { name: "Perfect Vocal Mimic", description: "Any sound, any language, any ringtone, cannot produce original thoughts vocally" },
      { name: "Turns Invisible When No One is Looking", description: "Technically always invisible, philosophically frustrated, existentially exhausted" },
      { name: "Secretes a Calming Pheromone", description: "Everyone within 10ft becomes 15% too friendly, handshakes last uncomfortably long" },
      { name: "Generates Elevator Music Aura", description: "Continuous, cannot be turned off, surprisingly effective at inducing compliance" },
    ],
    flaw: [
      { name: "Falls Asleep When Complimented", description: "Even mild praise triggers immediate unconsciousness, snores gently" },
      { name: "Deathly Afraid of the Color Blue", description: "Sky is a nightmare, jeans are a war crime, certain crayons are hostile" },
      { name: "Cannot Stop Narrating Its Own Actions in Third Person", description: "Loudly, at all times, with increasingly dramatic phrasing" },
      { name: "Melts Slightly Above 72 Degrees", description: "Structural integrity is weather-dependent, carries a personal thermometer" },
    ],
  },
}
