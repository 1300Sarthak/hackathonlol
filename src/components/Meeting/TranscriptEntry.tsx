import { motion } from "framer-motion"
import { EmotionBadge } from "./EmotionBadge"
import type { MeetingNote, EmotionType } from "../../types/meeting"

interface TranscriptEntryProps {
  note: MeetingNote
}

export function TranscriptEntry({ note }: TranscriptEntryProps) {
  const time = new Date(note.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  const isHighImportance = note.importance === "high"
  const isEmotionEvent = note.type === "emotion-event"

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className={`flex gap-2 py-1.5 px-2 rounded-md ${
        isHighImportance
          ? "bg-emotion-frustrated/5 border-l-2 border-emotion-frustrated/30"
          : isEmotionEvent
          ? "bg-white/[0.02] border-l-2 border-white/10"
          : ""
      }`}
    >
      <span className="text-[10px] font-mono text-white/30 shrink-0 pt-0.5 w-[52px]">
        {time}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          {note.participant && (
            <span className="text-[11px] font-semibold text-accent shrink-0">
              {note.participant}:
            </span>
          )}
          <span className={`leading-relaxed ${
            isEmotionEvent ? "text-[10px] text-white/50 italic" : "text-[12px] text-white/75"
          }`}>
            {note.text}
          </span>
        </div>
        {note.emotion && (
          <div className="mt-0.5">
            <EmotionBadge
              emotion={note.emotion as EmotionType}
              showEmoji={false}
              size="sm"
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}
