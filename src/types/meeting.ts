export type EmotionType =
  | "neutral"
  | "happy"
  | "confused"
  | "frustrated"
  | "anxious"
  | "disengaged"
  | "excited"
  | "sad"
  | "skeptical"
  | "focused"

export type EngagementLevel = "high" | "medium" | "low"

export type MeetingMood =
  | "positive"
  | "neutral"
  | "tense"
  | "confused"
  | "energized"

export type NoteType = "transcript" | "emotion-event" | "alert" | "summary"

export type Importance = "low" | "medium" | "high"

export interface Participant {
  id: string
  name: string
  position: string
  emotion: EmotionType
  confidence: number
  bodyLanguage: string
  alert: string | null
  engagement: EngagementLevel
  lastUpdated: number
  likelyTopic?: string
  sentiment?: string
  // Special needs support fields
  socialCue?: string // Plain-language explanation of what this person's behavior means
  emotionExplanation?: string // Why they might be feeling this way
  communicationTip?: string // How the user should respond to this person
  isSpeaking?: boolean // Whether this person appears to be talking
  speakerConfidence?: number // How confident we are they're speaking
}

export type NoteImportance = Importance

export interface MeetingNote {
  id: string
  timestamp: number
  text: string
  emotion?: string
  participant?: string
  type: NoteType
  importance: Importance
  socialContext?: string // What this means in social terms for special needs users
  speaker?: string // Who said this
}

export interface AnalysisResult {
  participants: Participant[]
  meetingMood: MeetingMood
  activeContext: string
  suggestedAction: string | null
  conversationSummary: string | null
  socialDynamics: string | null
}

export interface MeetingSettings {
  analysisFrequencyMs: number
  audioEnabled: boolean
  autoDetect: boolean
  theme: "dark" | "darker" | "dim"
}

export const DEFAULT_SETTINGS: MeetingSettings = {
  analysisFrequencyMs: 2000,
  audioEnabled: true,
  autoDetect: true,
  theme: "dark",
}
