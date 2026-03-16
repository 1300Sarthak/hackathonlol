import { motion } from "framer-motion"
import { EmotionBadge, getEmotionColor } from "./EmotionBadge"
import type { Participant, EmotionType } from "../../types/meeting"

interface ParticipantCardProps {
  participant: Participant
}

function EngagementDots({ level }: { level: string }) {
  const filled = level === "high" ? 3 : level === "medium" ? 2 : 1
  return (
    <div className="flex gap-0.5">
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
              style={{
                backgroundColor: `${emotionColor}20`,
                color: emotionColor,
              }}
            >
              {(participant.name || "?")[0].toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-white/90 truncate">
                  {participant.name || "Unknown"}
                </span>
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

        {/* Confidence bar */}
        {participant.confidence < 0.7 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[9px] text-white/30">conf</span>
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
