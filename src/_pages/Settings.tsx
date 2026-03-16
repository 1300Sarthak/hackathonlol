import { useState, useEffect } from "react"
import { X, Settings as SettingsIcon, Keyboard } from "lucide-react"
import { GlassPanel } from "../components/Meeting/GlassPanel"

interface SettingsProps {
  onClose: () => void
}

interface MeetingSettings {
  analysisFrequencyMs: number
  audioEnabled: boolean
  autoDetect: boolean
  theme: string
}

const HOTKEYS = [
  { keys: "⌘⇧S", action: "Toggle analysis" },
  { keys: "⌘⇧M", action: "Toggle mini mode" },
  { keys: "⌘⇧N", action: "Copy notes" },
  { keys: "⌘⇧E", action: "End & summarize" },
  { keys: "⌘B", action: "Toggle visibility" },
  { keys: "⌘←→↑↓", action: "Move window" },
]

export function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<MeetingSettings>({
    analysisFrequencyMs: 2000,
    audioEnabled: true,
    autoDetect: true,
    theme: "dark",
  })

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings)
  }, [])

  const updateSetting = (key: keyof MeetingSettings, value: any) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    window.electronAPI.updateSettings(updated)
  }

  return (
    <GlassPanel noPadding className="flex flex-col max-h-[680px]">
      {/* Header */}
      <div className="drag-region flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-semibold text-white/80">Settings</span>
        </div>
        <button
          onClick={onClose}
          className="no-drag p-1 rounded hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Analysis Frequency */}
        <div>
          <label className="text-[11px] font-medium text-white/60 block mb-2">
            Analysis Frequency
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1000}
              max={5000}
              step={500}
              value={settings.analysisFrequencyMs}
              onChange={(e) =>
                updateSetting("analysisFrequencyMs", Number(e.target.value))
              }
              className="no-drag flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
            />
            <span className="text-[10px] font-mono text-white/40 w-8 text-right">
              {(settings.analysisFrequencyMs / 1000).toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Audio Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-[11px] font-medium text-white/60 block">
              Audio Transcription
            </label>
            <p className="text-[9px] text-white/30 mt-0.5">
              Transcribe speech via Whisper
            </p>
          </div>
          <button
            onClick={() => updateSetting("audioEnabled", !settings.audioEnabled)}
            className={`no-drag w-8 h-4 rounded-full transition-colors relative ${
              settings.audioEnabled ? "bg-accent" : "bg-white/10"
            }`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                settings.audioEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Auto Detect */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-[11px] font-medium text-white/60 block">
              Auto-detect Calls
            </label>
            <p className="text-[9px] text-white/30 mt-0.5">
              Start when Zoom/Meet/Teams detected
            </p>
          </div>
          <button
            onClick={() => updateSetting("autoDetect", !settings.autoDetect)}
            className={`no-drag w-8 h-4 rounded-full transition-colors relative ${
              settings.autoDetect ? "bg-accent" : "bg-white/10"
            }`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                settings.autoDetect ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Hotkeys */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Keyboard className="w-3 h-3 text-white/40" />
            <label className="text-[11px] font-medium text-white/60">
              Keyboard Shortcuts
            </label>
          </div>
          <div className="space-y-1">
            {HOTKEYS.map(({ keys, action }) => (
              <div
                key={keys}
                className="flex items-center justify-between py-1"
              >
                <span className="text-[10px] text-white/50">{action}</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-mono text-white/40">
                  {keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassPanel>
  )
}
