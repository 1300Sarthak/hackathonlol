import React from "react"
import { cn } from "../../lib/utils"

interface GlassPanelProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function GlassPanel({ children, className, noPadding }: GlassPanelProps) {
  return (
    <div
      className={cn(
        "glass",
        !noPadding && "p-4",
        className
      )}
    >
      {children}
    </div>
  )
}
