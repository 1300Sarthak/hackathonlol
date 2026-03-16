import { cn } from "../../lib/utils"
import type { MeetingMood } from "../../types/meeting"

const MOOD_CONFIG: Record<MeetingMood, { color: string; bg: string; label: string }> = {
  positive: { color: "text-emotion-happy", bg: "bg-emotion-happy", label: "Positive" },
  neutral: { color: "text-emotion-neutral", bg: "bg-emotion-neutral", label: "Neutral" },
  tense: { color: "text-emotion-frustrated", bg: "bg-emotion-frustrated", label: "Tense" },
  confused: { color: "text-emotion-confused", bg: "bg-emotion-confused", label: "Confused" },
  energized: { color: "text-emotion-excited", bg: "bg-emotion-excited", label: "Energized" },
}

interface MoodIndicatorProps {
  mood: MeetingMood
  compact?: boolean
}

export function MoodIndicator({ mood, compact }: MoodIndicatorProps) {
  const config = MOOD_CONFIG[mood] || MOOD_CONFIG.neutral

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <div className={cn("w-1.5 h-1.5 rounded-full", config.bg)} />
        <span className={cn("text-[10px] font-medium", config.color)}>
          {config.label}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-2 h-2 rounded-full pulse-dot", config.bg)} />
      <span className={cn("text-xs font-medium", config.color)}>
        {config.label}
      </span>
    </div>
  )
}
