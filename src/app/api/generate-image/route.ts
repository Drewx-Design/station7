import { ImageRequestSchema } from '@/lib/schemas'
import { IMAGE_MODEL } from '@/lib/models'
import { sanitizePromptInput } from '@/lib/sanitize'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return Response.json({ imageUrl: null, error: 'Image generation not configured' })
  }

  let body
  try { body = await req.json() } catch {
    return Response.json({ imageUrl: null, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ImageRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ imageUrl: null, error: 'Invalid request body' }, { status: 400 })
  }

  const safePrompt = sanitizePromptInput(parsed.data.image_prompt, 2000)

  // Style anchor: ensures the image model produces creature illustrations, not stock photos
  const stylePrefix = `You are a xenobiology field illustrator. Generate a creature illustration — NOT a photograph, NOT photorealistic. Style: detailed biological creature concept art with a painted/illustrated aesthetic. The creature described below should be the central and ONLY subject, depicted against a simple background. Focus on accurate creature anatomy matching the description.\n\n`
  const colorContext = `Color palette: ${parsed.data.color_palette.join(', ')}. Mood: ${parsed.data.verdict}.\n\n`
  const fullPrompt = stylePrefix + colorContext + safePrompt

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: 'user', content: fullPrompt }],
        modalities: ['image', 'text'],
      }),
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.error('[generate-image] OpenRouter error:', response.status, await response.text().catch(() => ''))
      return Response.json({ imageUrl: null, error: 'Image generation failed' })
    }

    const data = await response.json()

    // Extract base64 image from OpenRouter response
    const content = data.choices?.[0]?.message?.content
    let imageUrl: string | null = null

    if (typeof content === 'string') {
      // Some models return inline base64 in content
      const match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/)
      if (match) imageUrl = match[0]
    }

    if (!imageUrl && Array.isArray(content)) {
      // Multimodal response: content is an array of parts
      for (const part of content) {
        if (part.type === 'image_url' && part.image_url?.url) {
          imageUrl = part.image_url.url
          break
        }
      }
    }

    // Also check the images array (some OpenRouter response formats)
    if (!imageUrl && data.choices?.[0]?.message?.images) {
      const images = data.choices[0].message.images
      if (images[0]?.image_url?.url) {
        imageUrl = images[0].image_url.url
      }
    }

    return Response.json({ imageUrl })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[generate-image] Request timed out after 30s')
    } else {
      console.error('[generate-image] Error:', err)
    }
    return Response.json({ imageUrl: null, error: 'Image generation failed' })
  }
}
