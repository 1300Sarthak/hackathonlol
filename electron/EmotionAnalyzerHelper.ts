import OpenAI from "openai"

export interface AnalysisParticipant {
  id: string
  name: string
  position: string
  emotion: string
  confidence: number
  bodyLanguage: string
  alert: string | null
  engagement: string
}

export interface AnalysisResult {
  participants: AnalysisParticipant[]
  meetingMood: string
  activeContext: string
  suggestedAction: string | null
}

const SYSTEM_PROMPT = `You are an expert emotional intelligence analyst watching a video call screenshot.
Analyze visible participants and return ONLY valid JSON (no markdown, no explanation) with this shape:

{
  "participants": [
    {
      "id": "person_1",
      "name": "Unknown",
      "position": "top-left",
      "emotion": "neutral",
      "confidence": 0.8,
      "bodyLanguage": "leaning forward",
      "alert": null,
      "engagement": "high"
    }
  ],
  "meetingMood": "neutral",
  "activeContext": "Video call in progress",
  "suggestedAction": null
}

Rules:
- emotion must be one of: neutral, happy, confused, frustrated, anxious, disengaged, excited, sad, skeptical, focused
- engagement must be: high, medium, or low
- position: top-left, top-right, bottom-left, bottom-right, center, full
- confidence: 0.0 to 1.0
- alerts should be rare and high-signal (e.g. "Appears very upset", "Seems disengaged")
- suggestedAction: concise, actionable, second-person ("Consider asking if they have questions")
- If no video call or no faces visible: {"participants":[],"meetingMood":"neutral","activeContext":"No active call detected","suggestedAction":null}
- Only include participants you can actually see with faces visible`

export class EmotionAnalyzerHelper {
  private client: OpenAI
  private lastCallTime: number = 0
  private minIntervalMs: number = 1500
  private consecutiveErrors: number = 0
  private readonly maxBackoffMs: number = 30000

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://integrate.api.nvidia.com/v1",
    })
  }

  public async analyzeFrame(base64Image: string): Promise<AnalysisResult | null> {
    // Rate limiting
    const now = Date.now()
    const timeSinceLastCall = now - this.lastCallTime
    const backoffMs = Math.min(
      this.minIntervalMs * Math.pow(2, this.consecutiveErrors),
      this.maxBackoffMs
    )

    if (timeSinceLastCall < backoffMs) {
      return null
    }

    this.lastCallTime = now

    try {
      const response = await this.client.chat.completions.create({
        model: "nvidia/llama-3.2-nv-vision-instruct",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
              {
                type: "text",
                text: "Analyze this video call screenshot. Return JSON only.",
              },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      })

      const text = response.choices[0]?.message?.content || "{}"

      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error("No JSON found in response:", text)
        this.consecutiveErrors++
        return null
      }

      const result = JSON.parse(jsonMatch[0]) as AnalysisResult
      this.consecutiveErrors = 0
      return result
    } catch (error) {
      this.consecutiveErrors++
      console.error("Emotion analysis error:", error)
      return null
    }
  }

  public async generateSummary(
    notes: Array<{ text: string; emotion?: string; participant?: string; timestamp: number }>,
    participants: Array<{ name: string; emotion: string }>
  ): Promise<string> {
    try {
      const notesText = notes
        .map((n) => {
          const time = new Date(n.timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
          const speaker = n.participant || "Unknown"
          const emotionTag = n.emotion ? ` [${n.emotion}]` : ""
          return `[${time}] ${speaker}: ${n.text}${emotionTag}`
        })
        .join("\n")

      const response = await this.client.chat.completions.create({
        model: "nvidia/llama-3.2-nv-vision-instruct",
        messages: [
          {
            role: "user",
            content: `You attended a meeting. Here are the notes:\n${notesText}\n\nParticipants observed: ${participants.map((p) => `${p.name} (${p.emotion})`).join(", ")}\n\nWrite a concise meeting summary with:\n1. Key points discussed\n2. Emotional dynamics observed\n3. Action items (if any)\n4. Overall meeting health score (1-10)\n\nKeep it under 200 words. Be direct and useful.`,
          },
        ],
        max_tokens: 512,
        temperature: 0.5,
      })

      return response.choices[0]?.message?.content || "Unable to generate summary."
    } catch (error) {
      console.error("Summary generation error:", error)
      return "Error generating meeting summary."
    }
  }

  public getApiStatus(): "healthy" | "degraded" | "error" {
    if (this.consecutiveErrors === 0) return "healthy"
    if (this.consecutiveErrors < 3) return "degraded"
    return "error"
  }
}
