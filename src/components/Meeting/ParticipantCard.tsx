import { motion } from "framer-motion"
import { Mic } from "lucide-react"
import { EmotionBadge, getEmotionColor } from "./EmotionBadge"
import type { EmotionType } from "../../types/meeting"

interface ParticipantData {
  id: string
  name: string
  position: string
  emotion: string
  confidence: number
  bodyLanguage: string
  alert: string | null
  engagement: string
  likelyTopic?: string
  sentiment?: string
  lastUpdated?: number
  socialCue?: string
  emotionExplanation?: string
  communicationTip?: string
  isSpeaking?: boolean
  speakerConfidence?: number
}

interface ParticipantCardProps {
  participant: ParticipantData
}

function EngagementDots({ level }: { level: string }) {
  const filled = level === "high" ? 3 : level === "medium" ? 2 : 1
  return (
    <div className="flex gap-0.5" title={`Engagement: ${level}`}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i <= filled ? "bg-emotion-focused" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  )
}

export function ParticipantCard({ participant }: ParticipantCardProps) {
  const emotionColor = getEmotionColor(participant.emotion)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="glass-card relative overflow-hidden"
    >
      {/* Emotion color bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[10px]"
        style={{ backgroundColor: emotionColor }}
      />

      <div className="pl-4 pr-3 py-2.5">
        {/* Top row: avatar + name + badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                style={{
                  backgroundColor: `${emotionColor}20`,
                  color: emotionColor,
                }}
              >
                {(participant.name || "?")[0].toUpperCase()}
              </div>
              {/* Speaking indicator */}
              {participant.isSpeaking && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent flex items-center justify-center">
                  <Mic className="w-2 h-2 text-white" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-white/90 truncate">
                  {participant.name || "Unknown"}
                </span>
                {participant.isSpeaking && (
                  <span className="text-[9px] text-accent font-medium">Speaking</span>
                )}
                {participant.alert && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emotion-frustrated pulse-dot shrink-0" />
                )}
              </div>
              <p className="text-[10px] text-white/40 truncate">
                {participant.bodyLanguage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <EngagementDots level={participant.engagement} />
            <EmotionBadge emotion={participant.emotion as EmotionType} />
          </div>
        </div>

        {/* Social Cue — most important for special needs users */}
        {participant.socialCue && (
          <div className="mt-2 pl-9">
            <div className="px-2.5 py-2 rounded-md bg-accent/5 border border-accent/10">
              <span className="text-[9px] text-accent/60 uppercase tracking-wider font-medium">
                What this means
              </span>
              <p className="text-[11px] text-white/70 leading-relaxed mt-0.5">
                {participant.socialCue}
              </p>
            </div>
          </div>
        )}

        {/* Emotion explanation */}
        {participant.emotionExplanation && (
          <div className="mt-1.5 pl-9">
            <div className="flex items-start gap-1.5">
              <span className="text-[9px] text-white/25 uppercase tracking-wider shrink-0 mt-0.5">
                Why
              </span>
              <p className="text-[10px] text-white/50 leading-relaxed">
                {participant.emotionExplanation}
              </p>
            </div>
          </div>
        )}

        {/* Communication tip */}
        {participant.communicationTip && (
          <div className="mt-1.5 pl-9">
            <div className="flex items-start gap-1.5">
              <span className="text-[9px] text-accent/50 uppercase tracking-wider shrink-0 mt-0.5">
                Tip
              </span>
              <p className="text-[10px] text-accent/70 leading-relaxed italic">
                {participant.communicationTip}
              </p>
            </div>
          </div>
        )}

        {/* Topic */}
        {participant.likelyTopic && (
          <div className="mt-1.5 pl-9">
            <div className="flex items-start gap-1.5">
              <span className="text-[9px] text-white/25 uppercase tracking-wider shrink-0 mt-0.5">
                Topic
              </span>
              <p className="text-[10px] text-white/50 leading-relaxed">
                {participant.likelyTopic}
              </p>
            </div>
          </div>
        )}

        {/* Alert message if present */}
        {participant.alert && (
          <div className="mt-1.5 pl-9">
            <div className="px-2.5 py-1.5 rounded-md bg-emotion-frustrated/10 border border-emotion-frustrated/20">
              <p className="text-[11px] text-emotion-frustrated/90 font-medium">
                {participant.alert}
              </p>
            </div>
          </div>
        )}

        {/* Confidence bar */}
        {participant.confidence < 0.7 && (
          <div className="mt-1.5 pl-9 flex items-center gap-1.5">
            <span className="text-[9px] text-white/20">conf</span>
            <div className="flex-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-white/20"
                style={{ width: `${participant.confidence * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
