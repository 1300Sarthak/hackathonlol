import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  Settings,
  Minus,
  Play,
  Square,
  Users,
  Copy,
  FileText,
} from "lucide-react"
import { useMeetingStore } from "../store/meetingStore"
import { ParticipantCard } from "../components/Meeting/ParticipantCard"
import { TranscriptEntry } from "../components/Meeting/TranscriptEntry"
import { AlertBanner } from "../components/Meeting/AlertBanner"
import { MoodIndicator } from "../components/Meeting/MoodIndicator"
import { GlassPanel } from "../components/Meeting/GlassPanel"
import type { MeetingMood } from "../types/meeting"

interface MeetingHUDProps {
  onOpenSettings: () => void
  onToggleMini: () => void
}

export function MeetingHUD({ onOpenSettings, onToggleMini }: MeetingHUDProps) {
  const {
    participants,
    notes,
    meetingMood,
    currentSuggestion,
    isActive,
    alerts,
    apiStatus,
    dismissAlert,
    isAnalyzing,
  } = useMeetingStore()

  const transcriptRef = useRef<HTMLDivElement>(null)

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [notes])

  const handleToggleMeeting = async () => {
    await window.electronAPI.toggleMeeting()
  }

  const handleCopyNotes = async () => {
    await window.electronAPI.copyNotes()
  }

  const handleEndMeeting = async () => {
    await window.electronAPI.stopMeeting()
    await window.electronAPI.generateSummary()
  }

  const transcriptNotes = notes.filter(
    (n) => n.type === "transcript" || n.type === "emotion-event"
  )

  const elapsedTime = useMeetingStore((s) =>
    s.meetingStartTime ? Math.floor((Date.now() - s.meetingStartTime) / 1000) : 0
  )

  return (
    <GlassPanel noPadding className="flex flex-col max-h-[680px] overflow-hidden">
      {/* Header — drag region */}
      <div className="drag-region flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-semibold text-white/80 tracking-wide">
            Social Translator
          </span>
        </div>
        <div className="no-drag flex items-center gap-1">
          <button
            onClick={onToggleMini}
            className="p-1 rounded hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1 rounded hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-3">
          {isActive ? (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emotion-happy pulse-dot" />
                <span className="text-[10px] font-medium text-white/60 uppercase tracking-wider">
                  Call Active
                </span>
              </div>
              <div className="flex items-center gap-1 text-white/40">
                <Users className="w-3 h-3" />
                <span className="text-[10px]">{participants.length}</span>
              </div>
              <MoodIndicator mood={meetingMood as MeetingMood} compact />
            </>
          ) : (
            <span className="text-[10px] text-white/30 uppercase tracking-wider">
              Waiting for a call...
            </span>
          )}
        </div>

        <div className="no-drag flex items-center gap-1">
          {isActive && (
            <>
              <button
                onClick={handleCopyNotes}
                className="p-1 rounded hover:bg-white/5 text-white/30 hover:text-white/50 transition-colors"
                title="Copy notes (⌘⇧N)"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={handleEndMeeting}
                className="p-1 rounded hover:bg-white/5 text-white/30 hover:text-white/50 transition-colors"
                title="End & summarize (⌘⇧E)"
              >
                <FileText className="w-3 h-3" />
              </button>
            </>
          )}
          <button
            onClick={handleToggleMeeting}
            className={`no-drag ml-1 p-1.5 rounded-md transition-colors ${
              isActive
                ? "bg-emotion-frustrated/20 hover:bg-emotion-frustrated/30 text-emotion-frustrated"
                : "bg-accent/20 hover:bg-accent/30 text-accent"
            }`}
            title={isActive ? "Stop (⌘⇧S)" : "Start (⌘⇧S)"}
          >
            {isActive ? (
              <Square className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="px-3 pt-2">
          <AlertBanner alerts={alerts} onDismiss={dismissAlert} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Suggestion */}
        <AnimatePresence>
          {currentSuggestion && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pt-3"
            >
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
                <span className="text-[10px]">💡</span>
                <span className="text-[11px] text-accent/80 leading-relaxed">
                  {currentSuggestion}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Participants */}
        {(participants.length > 0 || isAnalyzing) && (
          <div className="px-3 pt-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                Participants
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <AnimatePresence mode="popLayout">
                {participants.map((p) => (
                  <ParticipantCard key={p.id} participant={p} />
                ))}
              </AnimatePresence>
              {isAnalyzing && participants.length === 0 && (
                <div className="space-y-1.5">
                  {[1, 2].map((i) => (
                    <div key={i} className="glass-card h-12 shimmer rounded-lg" />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transcript */}
        {transcriptNotes.length > 0 && (
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                Live Notes
              </span>
              <span className="text-[9px] text-white/20">
                {transcriptNotes.length} entries
              </span>
            </div>
            <div
              ref={transcriptRef}
              className="max-h-[180px] overflow-y-auto space-y-0.5"
            >
              {transcriptNotes.map((note) => (
                <TranscriptEntry key={note.id} note={note} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isActive && participants.length === 0 && transcriptNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-xs text-white/30 text-center mb-1">
              No active call detected
            </p>
            <p className="text-[10px] text-white/20 text-center">
              Press <kbd className="px-1 py-0.5 rounded bg-white/5 text-white/40 font-mono text-[9px]">⌘⇧S</kbd> to start manually
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              apiStatus === "healthy"
                ? "bg-emotion-happy"
                : apiStatus === "degraded"
                ? "bg-emotion-anxious"
                : "bg-emotion-frustrated"
            }`}
          />
          <span className="text-[9px] text-white/20">
            {apiStatus === "healthy" ? "API OK" : apiStatus === "degraded" ? "Slow" : "Error"}
          </span>
        </div>
        {isActive && (
          <span className="text-[9px] font-mono text-white/20">
            {formatDuration(elapsedTime)}
          </span>
        )}
      </div>
    </GlassPanel>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
