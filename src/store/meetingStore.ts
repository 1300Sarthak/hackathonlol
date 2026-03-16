import { create } from "zustand"
import { v4 as uuidv4 } from "uuid"
import type {
  Participant,
  MeetingNote,
  MeetingMood,
  AnalysisResult,
  Importance,
  NoteType,
} from "../types/meeting"

interface MeetingStore {
  // State
  participants: Participant[]
  notes: MeetingNote[]
  meetingMood: MeetingMood
  currentSuggestion: string | null
  activeContext: string
  isActive: boolean
  isMiniMode: boolean
  meetingStartTime: number | null
  alerts: Array<{ id: string; participant: string; alert: string; timestamp: number }>
  apiStatus: "healthy" | "degraded" | "error"
  summary: string | null
  isAnalyzing: boolean

  // Actions
  updateFromAnalysis: (result: AnalysisResult) => void
  addTranscript: (text: string, emotion?: string, participant?: string) => void
  addAlert: (participant: string, alert: string) => void
  dismissAlert: (id: string) => void
  setMeetingActive: (active: boolean, startTime?: number) => void
  toggleMiniMode: () => void
  setApiStatus: (status: "healthy" | "degraded" | "error") => void
  setSummary: (summary: string) => void
  setIsAnalyzing: (analyzing: boolean) => void
  reset: () => void
  exportNotes: () => string
}

export const useMeetingStore = create<MeetingStore>((set, get) => ({
  participants: [],
  notes: [],
  meetingMood: "neutral",
  currentSuggestion: null,
  activeContext: "No active call detected",
  isActive: false,
  isMiniMode: false,
  meetingStartTime: null,
  alerts: [],
  apiStatus: "healthy",
  summary: null,
  isAnalyzing: false,

  updateFromAnalysis: (result) =>
    set((state) => {
      const now = Date.now()
      const updatedParticipants = result.participants.map((p) => ({
        ...p,
        lastUpdated: now,
      }))

      // Add emotion-event notes for significant changes
      const newNotes: MeetingNote[] = []
      for (const newP of updatedParticipants) {
        const oldP = state.participants.find((p) => p.id === newP.id)
        if (oldP && oldP.emotion !== newP.emotion && newP.confidence > 0.6) {
          newNotes.push({
            id: uuidv4(),
            timestamp: now,
            text: `${newP.name || "Someone"} shifted from ${oldP.emotion} to ${newP.emotion}`,
            emotion: newP.emotion,
            participant: newP.name,
            type: "emotion-event" as NoteType,
            importance: (["frustrated", "anxious", "sad"].includes(newP.emotion)
              ? "high"
              : "low") as Importance,
          })
        }
      }

      return {
        participants: updatedParticipants,
        meetingMood: result.meetingMood as MeetingMood,
        currentSuggestion: result.suggestedAction,
        activeContext: result.activeContext,
        notes: [...state.notes, ...newNotes].slice(-100),
        isAnalyzing: false,
      }
    }),

  addTranscript: (text, emotion, participant) =>
    set((state) => {
      const note: MeetingNote = {
        id: uuidv4(),
        timestamp: Date.now(),
        text,
        emotion,
        participant,
        type: "transcript",
        importance: emotion && ["frustrated", "anxious", "tense"].includes(emotion)
          ? "high"
          : "low",
      }
      return { notes: [...state.notes, note].slice(-100) }
    }),

  addAlert: (participant, alert) =>
    set((state) => ({
      alerts: [
        ...state.alerts,
        { id: uuidv4(), participant, alert, timestamp: Date.now() },
      ].slice(-10),
    })),

  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),

  setMeetingActive: (active, startTime) =>
    set({
      isActive: active,
      meetingStartTime: active ? startTime || Date.now() : null,
      summary: null,
    }),

  toggleMiniMode: () => set((state) => ({ isMiniMode: !state.isMiniMode })),

  setApiStatus: (status) => set({ apiStatus: status }),

  setSummary: (summary) => set({ summary }),

  setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),

  reset: () =>
    set({
      participants: [],
      notes: [],
      meetingMood: "neutral",
      currentSuggestion: null,
      activeContext: "No active call detected",
      isActive: false,
      isMiniMode: false,
      meetingStartTime: null,
      alerts: [],
      summary: null,
      isAnalyzing: false,
    }),

  exportNotes: () => {
    const state = get()
    return state.notes
      .map((n) => {
        const time = new Date(n.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
        const speaker = n.participant ? `${n.participant}: ` : ""
        const emotionTag = n.emotion ? ` [${n.emotion}]` : ""
        return `[${time}] ${speaker}${n.text}${emotionTag}`
      })
      .join("\n")
  },
}))
