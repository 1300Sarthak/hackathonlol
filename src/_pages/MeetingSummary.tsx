import { motion } from "framer-motion"
import { Copy, X, FileText } from "lucide-react"
import { useMeetingStore } from "../store/meetingStore"
import { GlassPanel } from "../components/Meeting/GlassPanel"

interface MeetingSummaryProps {
  onClose: () => void
}

export function MeetingSummary({ onClose }: MeetingSummaryProps) {
  const { summary, notes } = useMeetingStore()

  const handleCopy = () => {
    if (summary) {
      navigator.clipboard.writeText(summary)
    }
  }

  const handleCopyNotes = () => {
    const exported = useMeetingStore.getState().exportNotes()
    navigator.clipboard.writeText(exported)
  }

  return (
    <GlassPanel noPadding className="flex flex-col max-h-[680px]">
      {/* Header */}
      <div className="drag-region flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-semibold text-white/80">
            Meeting Summary
          </span>
        </div>
        <button
          onClick={onClose}
          className="no-drag p-1 rounded hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Summary Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {summary ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="text-[12px] text-white/70 leading-relaxed whitespace-pre-wrap">
                {summary}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCopy}
                className="no-drag flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent text-[11px] font-medium transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy Summary
              </button>
              <button
                onClick={handleCopyNotes}
                className="no-drag flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-[11px] font-medium transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy Full Notes
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-3 shimmer" />
            <p className="text-[11px] text-white/30">Generating summary...</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center gap-4">
        <span className="text-[9px] text-white/20">
          {notes.length} notes recorded
        </span>
        <span className="text-[9px] text-white/20">
          {notes.filter((n) => n.type === "transcript").length} transcripts
        </span>
      </div>
    </GlassPanel>
  )
}
