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
}

export interface MeetingNote {
  id: string
  timestamp: number
  text: string
  emotion?: string
  participant?: string
  type: NoteType
  importance: Importance
}

export interface AnalysisResult {
  participants: Participant[]
  meetingMood: MeetingMood
  activeContext: string
  suggestedAction: string | null
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
