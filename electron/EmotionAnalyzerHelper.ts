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
  likelyTopic: string
  sentiment: string
  socialCue: string
  emotionExplanation: string
  communicationTip: string
  isSpeaking: boolean
  speakerConfidence: number
}

export interface AnalysisResult {
  participants: AnalysisParticipant[]
  meetingMood: string
  activeContext: string
  suggestedAction: string | null
  conversationSummary: string | null
  socialDynamics: string | null
}

const SYSTEM_PROMPT = `You are an emotional intelligence analyst for a video call. Analyze every visible person.

Return ONLY valid JSON (no markdown, no extra text):

{
  "participants": [
    {
      "id": "person_1",
      "name": "Unknown",
      "position": "top-left",
      "emotion": "neutral",
      "confidence": 0.8,
      "bodyLanguage": "leaning forward, arms crossed, tense shoulders",
      "alert": null,
      "engagement": "high",
      "likelyTopic": "Listening to a technical discussion",
      "sentiment": "Cautiously optimistic but has concerns",
      "socialCue": "They are paying attention and care about what is being said. Crossed arms means they are comfortable, not upset.",
      "emotionExplanation": "They look focused because the topic matters to them.",
      "communicationTip": "Good time to share your thoughts — they are listening.",
      "isSpeaking": false,
      "speakerConfidence": 0.1
    }
  ],
  "meetingMood": "neutral",
  "activeContext": "Team standup — one person presenting while others listen",
  "suggestedAction": null,
  "conversationSummary": null,
  "socialDynamics": null
}

RULES:
- "emotion": ONE OF: neutral, happy, confused, frustrated, anxious, disengaged, excited, sad, skeptical, focused
- "engagement": high, medium, or low
- "confidence": 0.0-1.0
- "bodyLanguage": Detailed — posture, hands, head tilt, eyes, mouth. 5+ words.
- "socialCue": Explain what their behavior MEANS in plain language for someone who finds body language hard to read. 1-2 sentences.
- "emotionExplanation": WHY they might feel this way. 1 sentence.
- "communicationTip": What the user should do. 1 sentence.
- "isSpeaking": true if mouth open/gesturing as if talking
- "speakerConfidence": 0.0-1.0
- "alert": Only for important situations. Usually null.
- "name": Use name tag if visible, otherwise "Person 1" etc.
- "meetingMood": positive, neutral, tense, confused, or energized
- "activeContext": What's happening. 1-2 sentences.
- "suggestedAction": Advice if useful, else null.
- "conversationSummary": What's being discussed, null if unclear.
- "socialDynamics": Who's leading, comfort level, null if unclear.

If NO video call or faces visible: {"participants":[],"meetingMood":"neutral","activeContext":"No active call detected","suggestedAction":null,"conversationSummary":null,"socialDynamics":null}

Detect ALL visible people. Look for name tags and text on screen for context.`

// Known working NIM vision models (in preference order)
const VISION_MODELS = [
  "meta/llama-4-maverick-17b-128e-instruct",
  "nvidia/llama-3.2-90b-vision-instruct",
  "google/gemma-3-27b-it",
  "meta/llama-3.2-11b-vision-instruct",
]

export class EmotionAnalyzerHelper {
  private client: OpenAI
  private lastCallTime: number = 0
  private minIntervalMs: number = 2000
  private consecutiveErrors: number = 0
  private readonly maxBackoffMs: number = 30000
  private currentModelIndex: number = 0
  private isProcessing: boolean = false

  // Rolling transcript buffer for context
  private recentTranscripts: Array<{ text: string; timestamp: number }> = []
  private readonly maxTranscriptBuffer = 20

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://integrate.api.nvidia.com/v1",
    })
    console.log("[EmotionAnalyzer] Initialized with NVIDIA NIM API")
    console.log("[EmotionAnalyzer] Using model:", VISION_MODELS[0])
  }

  private getCurrentModel(): string {
    return VISION_MODELS[this.currentModelIndex] || VISION_MODELS[0]
  }

  private tryNextModel(): boolean {
    if (this.currentModelIndex < VISION_MODELS.length - 1) {
      this.currentModelIndex++
      console.log(`[EmotionAnalyzer] Switching to model: ${this.getCurrentModel()}`)
      return true
    }
    return false
  }

  public addTranscriptContext(text: string): void {
    this.recentTranscripts.push({ text, timestamp: Date.now() })
    if (this.recentTranscripts.length > this.maxTranscriptBuffer) {
      this.recentTranscripts = this.recentTranscripts.slice(-this.maxTranscriptBuffer)
    }
  }

  private getTranscriptContext(): string {
    if (this.recentTranscripts.length === 0) return ""

    const cutoff = Date.now() - 60000
    const recent = this.recentTranscripts.filter((t) => t.timestamp > cutoff)
    if (recent.length === 0) return ""

    const lines = recent.map((t) => t.text).join(" | ")
    return `\n\nRecent speech: "${lines}"`
  }

  public async analyzeFrame(base64Image: string): Promise<AnalysisResult | null> {
    if (this.isProcessing) return null

    const now = Date.now()
    const timeSinceLastCall = now - this.lastCallTime
    const backoffMs = this.consecutiveErrors > 0
      ? Math.min(this.minIntervalMs * Math.pow(2, this.consecutiveErrors), this.maxBackoffMs)
      : this.minIntervalMs

    if (timeSinceLastCall < backoffMs) {
      return null
    }

    this.isProcessing = true
    this.lastCallTime = now

    try {
      const transcriptContext = this.getTranscriptContext()
      const userPrompt = SYSTEM_PROMPT + transcriptContext +
        "\n\nAnalyze this video call screenshot now. Return JSON only."

      console.log(`[EmotionAnalyzer] Sending frame to ${this.getCurrentModel()}...`)

      const response = await this.client.chat.completions.create({
        model: this.getCurrentModel(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.3,
        stream: false,
      } as any)

      const text = response.choices[0]?.message?.content || "{}"
      console.log(`[EmotionAnalyzer] Got response (${text.length} chars)`)

      // Extract JSON from response (handle models that wrap in markdown)
      let jsonStr = text
      const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fencedMatch) {
        jsonStr = fencedMatch[1].trim()
      } else {
        const braceMatch = text.match(/\{[\s\S]*\}/)
        if (braceMatch) {
          jsonStr = braceMatch[0]
        }
      }

      let result: AnalysisResult
      try {
        result = JSON.parse(jsonStr) as AnalysisResult
      } catch (parseErr) {
        console.error("[EmotionAnalyzer] JSON parse error, raw:", text.substring(0, 200))
        this.consecutiveErrors++
        return null
      }

      // Ensure participants array exists
      if (!Array.isArray(result.participants)) {
        result.participants = []
      }

      // Ensure participants have all required fields with defaults
      result.participants = result.participants.map((p: any, i: number) => ({
        id: p.id || `person_${i + 1}`,
        name: p.name || `Person ${i + 1}`,
        position: p.position || "unknown",
        emotion: p.emotion || "neutral",
        confidence: typeof p.confidence === "number" ? p.confidence : 0.5,
        bodyLanguage: p.bodyLanguage || "not clearly visible",
        alert: p.alert || null,
        engagement: p.engagement || "medium",
        likelyTopic: p.likelyTopic || "Unable to determine",
        sentiment: p.sentiment || "Neutral expression",
        socialCue: p.socialCue || "",
        emotionExplanation: p.emotionExplanation || "",
        communicationTip: p.communicationTip || "",
        isSpeaking: p.isSpeaking === true,
        speakerConfidence: typeof p.speakerConfidence === "number" ? p.speakerConfidence : 0,
      }))

      // Ensure top-level fields
      result.meetingMood = result.meetingMood || "neutral"
      result.activeContext = result.activeContext || "No active call detected"
      result.suggestedAction = result.suggestedAction || null
      result.conversationSummary = result.conversationSummary || null
      result.socialDynamics = result.socialDynamics || null

      this.consecutiveErrors = 0
      console.log(`[EmotionAnalyzer] Detected ${result.participants.length} participants`)
      return result
    } catch (error: any) {
      this.consecutiveErrors++
      const errMsg = error?.message || String(error)
      const statusCode = error?.status || error?.response?.status

      console.error(`[EmotionAnalyzer] Error (attempt ${this.consecutiveErrors}):`, errMsg)

      if (statusCode === 404 || statusCode === 400 || errMsg.includes("not found") || errMsg.includes("does not exist")) {
        if (this.tryNextModel()) {
          this.consecutiveErrors = 0
          console.log(`[EmotionAnalyzer] Will retry with ${this.getCurrentModel()}`)
        }
      }

      return null
    } finally {
      this.isProcessing = false
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
        model: this.getCurrentModel(),
        messages: [
          {
            role: "user",
            content: `You attended a meeting. Here are the notes:\n${notesText}\n\nParticipants: ${participants.map((p) => `${p.name} (${p.emotion})`).join(", ")}\n\nWrite a meeting summary in plain language with:\n1. What Was Discussed (bullet points)\n2. How People Were Feeling (describe each person's emotions simply)\n3. Important Moments (mood changes, disagreements)\n4. Action Items (if any)\n5. Meeting Score (1-10)\n\nKeep under 250 words. Use simple sentences.`,
          },
        ],
        max_tokens: 1024,
        temperature: 0.5,
      })

      return response.choices[0]?.message?.content || "Unable to generate summary."
    } catch (error) {
      console.error("[EmotionAnalyzer] Summary generation error:", error)
      return "Error generating meeting summary."
    }
  }

  public getApiStatus(): "healthy" | "degraded" | "error" {
    if (this.consecutiveErrors === 0) return "healthy"
    if (this.consecutiveErrors < 3) return "degraded"
    return "error"
  }
}
