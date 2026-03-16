import { useEffect, useRef, useState, useCallback } from "react"
import { useMeetingStore } from "./store/meetingStore"
import { MeetingHUD } from "./_pages/MeetingHUD"
import { MiniBar } from "./_pages/MiniBar"
import { MeetingSummary } from "./_pages/MeetingSummary"
import { Settings } from "./_pages/Settings"
import { Onboarding } from "./_pages/Onboarding"

type View = "onboarding" | "hud" | "mini" | "summary" | "settings"

function App() {
  const [view, setView] = useState<View>("hud")
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  const updateFromAnalysis = useMeetingStore((s) => s.updateFromAnalysis)
  const addTranscript = useMeetingStore((s) => s.addTranscript)
  const setMeetingActive = useMeetingStore((s) => s.setMeetingActive)
  const setIsAnalyzing = useMeetingStore((s) => s.setIsAnalyzing)
  const setSummary = useMeetingStore((s) => s.setSummary)
  const addAlert = useMeetingStore((s) => s.addAlert)
  const setApiStatus = useMeetingStore((s) => s.setApiStatus)
  const reset = useMeetingStore((s) => s.reset)

  // Check if onboarded on mount
  useEffect(() => {
    async function init() {
      try {
        const hasOnboarded = await window.electronAPI.getHasOnboarded()
        if (!hasOnboarded) {
          setView("onboarding")
        }
      } catch {
        // If API not available (dev mode), skip onboarding
      }
      setIsLoading(false)
    }
    init()
  }, [])

  // Wire up IPC event listeners
  useEffect(() => {
    const cleanups: Array<() => void> = []

    cleanups.push(
      window.electronAPI.onAnalysisResult((result: any) => {
        updateFromAnalysis(result)
      })
    )

    cleanups.push(
      window.electronAPI.onTranscriptUpdate((data: any) => {
        addTranscript(data.text, data.emotion, data.participant)
      })
    )

    cleanups.push(
      window.electronAPI.onMeetingStarted((data: any) => {
        setMeetingActive(true, data.startTime)
        setIsAnalyzing(true)
      })
    )

    cleanups.push(
      window.electronAPI.onMeetingEnded(() => {
        setMeetingActive(false)
      })
    )

    cleanups.push(
      window.electronAPI.onMeetingSummary((summary: string) => {
        setSummary(summary)
        setView("summary")
      })
    )

    cleanups.push(
      window.electronAPI.onAlert((data: any) => {
        addAlert(data.participant, data.alert)
      })
    )

    cleanups.push(
      window.electronAPI.onApiStatus((status: string) => {
        setApiStatus(status as "healthy" | "degraded" | "error")
      })
    )

    cleanups.push(
      window.electronAPI.onToggleMiniMode(() => {
        setView((v) => (v === "mini" ? "hud" : "mini"))
      })
    )

    return () => cleanups.forEach((fn) => fn())
  }, [
    updateFromAnalysis,
    addTranscript,
    setMeetingActive,
    setIsAnalyzing,
    setSummary,
    addAlert,
    setApiStatus,
  ])

  // ResizeObserver to update electron window dimensions
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (!containerRef.current) return
      const { scrollWidth: width, scrollHeight: height } = containerRef.current
      if (width > 0 && height > 0) {
        window.electronAPI?.updateContentDimensions({
          width: Math.ceil(width),
          height: Math.ceil(height),
        })
      }
    }

    const resizeObserver = new ResizeObserver(() => updateDimensions())
    resizeObserver.observe(containerRef.current)

    const mutationObserver = new MutationObserver(() => updateDimensions())
    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
    })

    updateDimensions()

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [view])

  const handleToggleMini = useCallback(() => {
    setView((v) => (v === "mini" ? "hud" : "mini"))
  }, [])

  if (isLoading) {
    return <div className="w-full h-screen" />
  }

  return (
    <div ref={containerRef}>
      {view === "onboarding" && (
        <Onboarding onComplete={() => setView("hud")} />
      )}

      {view === "hud" && (
        <MeetingHUD
          onOpenSettings={() => setView("settings")}
          onToggleMini={handleToggleMini}
        />
      )}

      {view === "mini" && <MiniBar onExpand={handleToggleMini} />}

      {view === "summary" && (
        <MeetingSummary
          onClose={() => {
            reset()
            setView("hud")
          }}
        />
      )}

      {view === "settings" && <Settings onClose={() => setView("hud")} />}
    </div>
  )
}

export default App
