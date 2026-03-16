import { motion, AnimatePresence } from "framer-motion"
import { X, AlertTriangle } from "lucide-react"
import { useEffect } from "react"

interface AlertBannerProps {
  alerts: Array<{
    id: string
    participant: string
    alert: string
    timestamp: number
  }>
  onDismiss: (id: string) => void
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <AnimatePresence mode="popLayout">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function AlertItem({
  alert,
  onDismiss,
}: {
  alert: { id: string; participant: string; alert: string; timestamp: number }
  onDismiss: (id: string) => void
}) {
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(alert.id), 8000)
    return () => clearTimeout(timer)
  }, [alert.id, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emotion-frustrated/10 border border-emotion-frustrated/20"
    >
      <AlertTriangle className="w-3.5 h-3.5 text-emotion-frustrated shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-medium text-emotion-frustrated">
          {alert.participant}
        </span>
        <span className="text-[10px] text-white/50 mx-1">—</span>
        <span className="text-[10px] text-white/70">{alert.alert}</span>
      </div>
      <button
        onClick={() => onDismiss(alert.id)}
        className="no-drag p-0.5 rounded hover:bg-white/5 text-white/30 hover:text-white/50 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  )
}
