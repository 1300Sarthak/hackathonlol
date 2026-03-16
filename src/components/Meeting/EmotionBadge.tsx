import { cn } from "../../lib/utils"
import type { EmotionType } from "../../types/meeting"

const EMOTION_COLORS: Record<EmotionType, string> = {
  happy: "bg-emotion-happy/20 text-emotion-happy border-emotion-happy/30",
  frustrated: "bg-emotion-frustrated/20 text-emotion-frustrated border-emotion-frustrated/30",
  anxious: "bg-emotion-anxious/20 text-emotion-anxious border-emotion-anxious/30",
  confused: "bg-emotion-confused/20 text-emotion-confused border-emotion-confused/30",
  neutral: "bg-emotion-neutral/20 text-emotion-neutral border-emotion-neutral/30",
  excited: "bg-emotion-excited/20 text-emotion-excited border-emotion-excited/30",
  sad: "bg-emotion-sad/20 text-emotion-sad border-emotion-sad/30",
  disengaged: "bg-emotion-disengaged/20 text-emotion-disengaged border-emotion-disengaged/30",
  skeptical: "bg-emotion-skeptical/20 text-emotion-skeptical border-emotion-skeptical/30",
  focused: "bg-emotion-focused/20 text-emotion-focused border-emotion-focused/30",
}

const EMOTION_EMOJI: Record<EmotionType, string> = {
  happy: "😊",
  frustrated: "😤",
  anxious: "😰",
  confused: "😕",
  neutral: "😐",
  excited: "🤩",
  sad: "😢",
  disengaged: "😶",
  skeptical: "🤨",
  focused: "🧐",
}

interface EmotionBadgeProps {
  emotion: EmotionType
  showEmoji?: boolean
  size?: "sm" | "md"
  className?: string
}

export function EmotionBadge({
  emotion,
  showEmoji = true,
  size = "sm",
  className,
}: EmotionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium capitalize",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral,
        className
      )}
    >
      {showEmoji && <span>{EMOTION_EMOJI[emotion] || "😐"}</span>}
      {emotion}
    </span>
  )
}

export function getEmotionColor(emotion: string): string {
  const colorMap: Record<string, string> = {
    happy: "#34d399",
    frustrated: "#f87171",
    anxious: "#fb923c",
    confused: "#a78bfa",
    neutral: "#6b7280",
    excited: "#fbbf24",
    sad: "#60a5fa",
    disengaged: "#4b5563",
    skeptical: "#e879f9",
    focused: "#38bdf8",
  }
  return colorMap[emotion] || colorMap.neutral
}
