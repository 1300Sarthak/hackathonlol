import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Monitor, Mic, CheckCircle2, ArrowRight } from "lucide-react"
import { GlassPanel } from "../components/Meeting/GlassPanel"

interface OnboardingProps {
  onComplete: () => void
}

type Step = "screen" | "mic" | "done"

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>("screen")
  const [permissions, setPermissions] = useState({ screen: false, microphone: false })

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    const perms = await window.electronAPI.checkPermissions()
    setPermissions(perms)

    if (perms.screen && perms.microphone) {
      setStep("done")
    } else if (perms.screen) {
      setStep("mic")
    }
  }

  const handleRequestMic = async () => {
    await window.electronAPI.requestMicPermission()
    await checkPermissions()
  }

  const handleComplete = async () => {
    await window.electronAPI.setHasOnboarded(true)
    onComplete()
  }

  const steps = [
    {
      id: "screen" as Step,
      icon: Monitor,
      title: "Screen Recording",
      description:
        "Social Translator needs to see your screen to detect video call participants and analyze facial expressions.",
      action: "Open System Settings",
      onAction: () => {
        // Opens the screen recording pane
        window.electronAPI.openExternal(
          "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
        )
        // Poll for permission grant
        const interval = setInterval(async () => {
          const perms = await window.electronAPI.checkPermissions()
          if (perms.screen) {
            clearInterval(interval)
            setPermissions(perms)
            setStep("mic")
          }
        }, 2000)
      },
    },
    {
      id: "mic" as Step,
      icon: Mic,
      title: "Microphone Access",
      description:
        "Enable microphone access for real-time speech transcription and emotional context analysis.",
      action: "Grant Access",
      onAction: handleRequestMic,
    },
  ]

  const currentStep = steps.find((s) => s.id === step)

  return (
    <GlassPanel className="flex flex-col items-center py-8 px-6 max-w-sm mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {["screen", "mic", "done"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                s === step
                  ? "bg-accent"
                  : steps.findIndex((st) => st.id === step) > i ||
                    step === "done"
                  ? "bg-accent/40"
                  : "bg-white/10"
              }`}
            />
            {i < 2 && <div className="w-8 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === "done" ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 rounded-full bg-emotion-happy/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-emotion-happy" />
            </div>
            <h2 className="text-sm font-semibold text-white/90 mb-1.5">
              You're all set!
            </h2>
            <p className="text-[11px] text-white/40 mb-6 leading-relaxed max-w-[240px]">
              Social Translator will detect your video calls and provide real-time
              emotional intelligence insights.
            </p>
            <button
              onClick={handleComplete}
              className="no-drag flex items-center gap-2 px-5 py-2 rounded-lg bg-accent hover:bg-accent/80 text-white text-xs font-medium transition-colors"
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ) : currentStep ? (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <currentStep.icon className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-white/90 mb-1.5">
              {currentStep.title}
            </h2>
            <p className="text-[11px] text-white/40 mb-6 leading-relaxed max-w-[240px]">
              {currentStep.description}
            </p>
            <button
              onClick={currentStep.onAction}
              className="no-drag flex items-center gap-2 px-5 py-2 rounded-lg bg-accent hover:bg-accent/80 text-white text-xs font-medium transition-colors"
            >
              {currentStep.action}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Skip option */}
            <button
              onClick={() => {
                if (step === "screen") setStep("mic")
                else setStep("done")
              }}
              className="no-drag mt-3 text-[10px] text-white/20 hover:text-white/40 transition-colors"
            >
              Skip for now
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </GlassPanel>
  )
}
