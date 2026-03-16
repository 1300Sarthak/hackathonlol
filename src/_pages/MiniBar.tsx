import { Users, Maximize2 } from "lucide-react"
import { useMeetingStore } from "../store/meetingStore"
import { MoodIndicator } from "../components/Meeting/MoodIndicator"
import type { MeetingMood } from "../types/meeting"

interface MiniBarProps {
  onExpand: () => void
}

export function MiniBar({ onExpand }: MiniBarProps) {
  const { participants, meetingMood, isActive } = useMeetingStore()

  return (
    <div
      onClick={onExpand}
      className="glass cursor-pointer flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-colors"
      style={{ width: 280, height: 52 }}
    >
      {isActive ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emotion-happy pulse-dot shrink-0" />
          <div className="flex items-center gap-1 text-white/50">
            <Users className="w-3 h-3" />
            <span className="text-[11px] font-medium">{participants.length}</span>
          </div>
          <MoodIndicator mood={meetingMood as MeetingMood} compact />
          <div className="flex-1" />
          <Maximize2 className="w-3 h-3 text-white/20" />
        </>
      ) : (
        <>
          <div className="w-2 h-2 rounded-full bg-white/20 shrink-0" />
          <span className="text-[11px] text-white/40">Waiting for call...</span>
          <div className="flex-1" />
          <Maximize2 className="w-3 h-3 text-white/20" />
        </>
      )}
    </div>
  )
}
