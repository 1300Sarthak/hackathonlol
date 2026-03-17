import { app, BrowserWindow, clipboard, systemPreferences } from "electron"
import { initializeIpcHandlers } from "./ipcHandlers"
import { WindowHelper } from "./WindowHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { ShortcutsHelper } from "./shortcuts"
import { AudioHelper } from "./AudioHelper"
import { EmotionAnalyzerHelper, type AnalysisResult } from "./EmotionAnalyzerHelper"
import { MeetingDetector } from "./MeetingDetector"
import { FrameDiffHelper } from "./FrameDiffHelper"
import { store } from "./store"
import { initAutoUpdater } from "./autoUpdater"
import * as dotenv from "dotenv"
import path from "node:path"

// Load environment variables — try multiple paths since cwd varies in dev vs prod
const envPaths = [
  path.join(process.cwd(), ".env.local"),
  path.join(__dirname, "..", ".env.local"),
  path.join(__dirname, "..", "..", ".env.local"),
]
for (const envPath of envPaths) {
  dotenv.config({ path: envPath })
}
dotenv.config() // fallback to .env

export type ViewType = "onboarding" | "hud" | "mini" | "summary" | "settings"

export class AppState {
  private static instance: AppState | null = null

  private windowHelper: WindowHelper
  private screenshotHelper: ScreenshotHelper
  public shortcutsHelper: ShortcutsHelper
  private audioHelper: AudioHelper
  private emotionAnalyzer: EmotionAnalyzerHelper | null = null
  private meetingDetector: MeetingDetector
  private frameDiffHelper: FrameDiffHelper

  // View management
  private view: ViewType = "hud"

  // Meeting state
  private isMeetingActive: boolean = false
  private meetingStartTime: number = 0
  private analysisInterval: NodeJS.Timeout | null = null
  private lastAnalysisResult: AnalysisResult | null = null

  // Collected notes for summary
  private meetingNotes: Array<{
    text: string
    emotion?: string
    participant?: string
    timestamp: number
  }> = []

  // Events
  public readonly EVENTS = {
    ANALYSIS_RESULT: "analysis-result",
    TRANSCRIPT_UPDATE: "transcript-update",
    MEETING_STARTED: "meeting-started",
    MEETING_ENDED: "meeting-ended",
    MEETING_SUMMARY: "meeting-summary",
    ALERT: "meeting-alert",
    API_STATUS: "api-status",
    VIEW_CHANGED: "view-changed",
  } as const

  constructor() {
    this.windowHelper = new WindowHelper(this)
    this.screenshotHelper = new ScreenshotHelper()
    this.shortcutsHelper = new ShortcutsHelper(this)
    this.audioHelper = new AudioHelper()
    this.meetingDetector = new MeetingDetector()
    this.frameDiffHelper = new FrameDiffHelper()

    // Initialize emotion analyzer with Claude API key
    const apiKey = process.env.CLAUDE_API_KEY
    console.log(`[AppState] CLAUDE_API_KEY loaded: ${apiKey ? "YES (" + apiKey.substring(0, 12) + "...)" : "NO — check .env.local"}`)
    if (apiKey) {
      this.emotionAnalyzer = new EmotionAnalyzerHelper(apiKey)
    } else {
      console.error("[AppState] WARNING: No CLAUDE_API_KEY found. Analysis will not work.")
      console.error("[AppState] Searched paths:", envPaths)
    }

    // Set up audio transcription callback — also feed into emotion analyzer for context
    this.audioHelper.setOnTranscription((text) => {
      this.handleTranscription(text)
      // Feed transcript to emotion analyzer so it can use conversation context
      if (this.emotionAnalyzer) {
        this.emotionAnalyzer.addTranscriptContext(text)
      }
    })

    // Set up meeting detection callbacks
    const settings = store.get("settings")
    if (settings.autoDetect) {
      this.meetingDetector.setCallbacks(
        () => {
          console.log("Meeting detected — auto-starting analysis")
          this.startMeetingAnalysis()
        },
        () => {
          console.log("Meeting ended — stopping analysis")
          this.stopMeetingAnalysis()
        }
      )
      this.meetingDetector.startPolling()
    }
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  // Getters
  public getMainWindow(): BrowserWindow | null {
    return this.windowHelper.getMainWindow()
  }

  public getView(): ViewType {
    return this.view
  }

  public setView(view: ViewType): void {
    this.view = view
    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(this.EVENTS.VIEW_CHANGED, view)
    }
  }

  public isVisible(): boolean {
    return this.windowHelper.isVisible()
  }

  public isMeetingRunning(): boolean {
    return this.isMeetingActive
  }

  public getHasDebugged(): boolean {
    return false // Not used in Social Translator, but WindowHelper references it
  }

  // Meeting Analysis
  public async startMeetingAnalysis(): Promise<void> {
    if (this.isMeetingActive) return
    if (!this.emotionAnalyzer) {
      console.error("No API key configured — cannot start analysis")
      return
    }

    this.isMeetingActive = true
    this.meetingStartTime = Date.now()
    this.meetingNotes = []
    this.frameDiffHelper.reset()

    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(this.EVENTS.MEETING_STARTED, {
        startTime: this.meetingStartTime,
      })
    }

    // Audio transcription now handled by Web Speech API in the renderer
    // sox/Whisper recording disabled — renderer sends transcripts via IPC
    const settings = store.get("settings")

    // Start periodic screen capture + analysis
    const intervalMs = settings.analysisFrequencyMs || 2000
    this.analysisInterval = setInterval(() => {
      this.runAnalysisCycle()
    }, intervalMs)

    // Run first cycle immediately
    this.runAnalysisCycle()

    console.log(`Meeting analysis started (interval: ${intervalMs}ms)`)
  }

  public async stopMeetingAnalysis(): Promise<void> {
    if (!this.isMeetingActive) return

    this.isMeetingActive = false

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval)
      this.analysisInterval = null
    }

    await this.audioHelper.stopRecording()

    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(this.EVENTS.MEETING_ENDED, {
        duration: Date.now() - this.meetingStartTime,
      })
    }

    console.log("Meeting analysis stopped")
  }

  public async toggleMeetingAnalysis(): Promise<void> {
    if (this.isMeetingActive) {
      await this.stopMeetingAnalysis()
    } else {
      await this.startMeetingAnalysis()
    }
  }

  private async runAnalysisCycle(): Promise<void> {
    if (!this.isMeetingActive || !this.emotionAnalyzer) return

    try {
      // Capture screen (no hide/show — contentProtection keeps our window invisible in screenshots)
      const { buffer, base64, mediaType } = await this.screenshotHelper.captureToBuffer()

      // Check frame diff — skip if not significantly changed
      const hasChange = this.frameDiffHelper.hasSignificantChange(buffer)
      if (!hasChange) {
        return
      }

      // Analyze with Claude
      const result = await this.emotionAnalyzer.analyzeFrame(base64, mediaType)
      if (!result) return

      this.lastAnalysisResult = result

      // Send result to renderer
      const mainWindow = this.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(this.EVENTS.ANALYSIS_RESULT, result)

        // Send API status
        mainWindow.webContents.send(
          this.EVENTS.API_STATUS,
          this.emotionAnalyzer.getApiStatus()
        )

        // Handle alerts
        for (const p of result.participants) {
          if (p.alert) {
            mainWindow.webContents.send(this.EVENTS.ALERT, {
              participant: p.name,
              alert: p.alert,
              timestamp: Date.now(),
            })
          }
        }
      }
    } catch (error) {
      console.error("Analysis cycle error:", error)
    }
  }

  // Called from renderer-side Web Speech API
  public handleRendererTranscript(text: string, speaker?: string): void {
    // Feed to emotion analyzer for context
    if (this.emotionAnalyzer) {
      this.emotionAnalyzer.addTranscriptContext(text)
    }

    // Try to attribute speaker from analysis if not provided
    if (!speaker && this.lastAnalysisResult?.participants) {
      const speakingPerson = this.lastAnalysisResult.participants.find(
        (p) => p.isSpeaking && p.speakerConfidence > 0.5
      )
      if (speakingPerson) {
        speaker = speakingPerson.name
      }
    }

    const note = {
      text,
      timestamp: Date.now(),
      emotion: this.lastAnalysisResult?.meetingMood,
      participant: speaker,
    }
    this.meetingNotes.push(note)

    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(this.EVENTS.TRANSCRIPT_UPDATE, note)
    }
  }

  private handleTranscription(text: string): void {
    // Fallback handler for sox/Whisper (mostly unused now that Web Speech API handles transcription)
    this.handleRendererTranscript(text)
  }

  public async generateMeetingSummary(): Promise<string> {
    if (!this.emotionAnalyzer) return "No API key configured."

    const participants = (this.lastAnalysisResult?.participants || []).map(
      (p) => ({ name: p.name, emotion: p.emotion })
    )

    const summary = await this.emotionAnalyzer.generateSummary(
      this.meetingNotes,
      participants
    )

    const mainWindow = this.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(this.EVENTS.MEETING_SUMMARY, summary)
    }

    return summary
  }

  public copyNotesToClipboard(): void {
    const notesText = this.meetingNotes
      .map((n) => {
        const time = new Date(n.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
        const emotionTag = n.emotion ? ` [${n.emotion}]` : ""
        return `[${time}] ${n.text}${emotionTag}`
      })
      .join("\n")

    clipboard.writeText(notesText || "No notes recorded yet.")
  }

  public getSettings() {
    return store.get("settings")
  }

  public updateSettings(settings: any): void {
    store.set("settings", { ...store.get("settings"), ...settings })
  }

  public getHasOnboarded(): boolean {
    return store.get("hasOnboarded")
  }

  public setHasOnboarded(value: boolean): void {
    store.set("hasOnboarded", value)
  }

  public checkPermissions(): { screen: boolean; microphone: boolean } {
    const screen =
      systemPreferences.getMediaAccessStatus("screen") === "granted"
    const microphone =
      systemPreferences.getMediaAccessStatus("microphone") === "granted"
    return { screen, microphone }
  }

  public async requestMicPermission(): Promise<boolean> {
    return await systemPreferences.askForMediaAccess("microphone")
  }

  // Window management
  public createWindow(): void {
    this.windowHelper.createWindow()
  }

  public hideMainWindow(): void {
    this.windowHelper.hideMainWindow()
  }

  public showMainWindow(): void {
    this.windowHelper.showMainWindow()
  }

  public toggleMainWindow(): void {
    this.windowHelper.toggleMainWindow()
  }

  public setWindowDimensions(width: number, height: number): void {
    this.windowHelper.setWindowDimensions(width, height)
  }

  public moveWindowLeft(): void {
    this.windowHelper.moveWindowLeft()
  }

  public moveWindowRight(): void {
    this.windowHelper.moveWindowRight()
  }

  public moveWindowDown(): void {
    this.windowHelper.moveWindowDown()
  }

  public moveWindowUp(): void {
    this.windowHelper.moveWindowUp()
  }

  // Cleanup
  public async cleanup(): Promise<void> {
    await this.stopMeetingAnalysis()
    await this.audioHelper.cleanup()
    this.meetingDetector.cleanup()
  }
}

// Application initialization
async function initializeApp() {
  const appState = AppState.getInstance()

  initializeIpcHandlers(appState)

  app.whenReady().then(() => {
    appState.createWindow()
    appState.shortcutsHelper.registerGlobalShortcuts()

    if (app.isPackaged) {
      initAutoUpdater()
    } else {
      console.log("Running in development mode — auto-updater disabled")
    }
  })

  app.on("activate", () => {
    if (appState.getMainWindow() === null) {
      appState.createWindow()
    }
  })

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })

  app.on("will-quit", async () => {
    await appState.cleanup()
  })

  app.dock?.hide()
  app.commandLine.appendSwitch("disable-background-timer-throttling")
}

initializeApp().catch(console.error)
