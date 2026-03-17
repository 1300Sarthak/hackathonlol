import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

const MEETING_APPS = [
  "zoom.us",
  "Microsoft Teams",
  "Webex",
  "FaceTime",
  "Slack",
]

const BROWSER_MEET_PATTERNS = [
  "meet.google.com",
  "teams.microsoft.com",
  "zoom.us/j",
]

export class MeetingDetector {
  private pollInterval: NodeJS.Timeout | null = null
  private isMeetingDetected: boolean = false
  private onMeetingDetected: (() => void) | null = null
  private onMeetingEnded: (() => void) | null = null

  // Debounce: require N consecutive checks before changing state
  private consecutiveDetections: number = 0
  private consecutiveMisses: number = 0
  private readonly detectThreshold = 2 // need 2 consecutive detections to start
  private readonly missThreshold = 3 // need 3 consecutive misses to stop

  public setCallbacks(
    onDetected: () => void,
    onEnded: () => void
  ): void {
    this.onMeetingDetected = onDetected
    this.onMeetingEnded = onEnded
  }

  public async getFrontmostApp(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`
      )
      return stdout.trim()
    } catch {
      return ""
    }
  }

  public async getBrowserTitle(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `osascript -e 'tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
          if frontApp is "Google Chrome" then
            tell application "Google Chrome" to get title of active tab of front window
          else if frontApp is "Safari" then
            tell application "Safari" to get name of current tab of front window
          else if frontApp is "Arc" then
            tell application "Arc" to get title of active tab of front window
          else
            return ""
          end if
        end tell'`
      )
      return stdout.trim()
    } catch {
      return ""
    }
  }

  public async checkForMeeting(): Promise<boolean> {
    const frontApp = await this.getFrontmostApp()

    // Check native meeting apps
    if (MEETING_APPS.some((app) => frontApp.includes(app))) {
      return true
    }

    // Check browser-based meetings
    if (
      ["Google Chrome", "Safari", "Arc", "Microsoft Edge", "Firefox"].some(
        (b) => frontApp.includes(b)
      )
    ) {
      const title = await this.getBrowserTitle()
      if (
        BROWSER_MEET_PATTERNS.some((pattern) =>
          title.toLowerCase().includes(pattern)
        )
      ) {
        return true
      }
    }

    return false
  }

  public startPolling(intervalMs: number = 5000): void {
    if (this.pollInterval) return

    this.pollInterval = setInterval(async () => {
      const meetingActive = await this.checkForMeeting()

      if (meetingActive) {
        this.consecutiveMisses = 0
        this.consecutiveDetections++

        if (!this.isMeetingDetected && this.consecutiveDetections >= this.detectThreshold) {
          this.isMeetingDetected = true
          this.onMeetingDetected?.()
        }
      } else {
        this.consecutiveDetections = 0
        this.consecutiveMisses++

        if (this.isMeetingDetected && this.consecutiveMisses >= this.missThreshold) {
          this.isMeetingDetected = false
          this.onMeetingEnded?.()
        }
      }
    }, intervalMs)
  }

  public stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  public getMeetingStatus(): boolean {
    return this.isMeetingDetected
  }

  public cleanup(): void {
    this.stopPolling()
    this.isMeetingDetected = false
    this.consecutiveDetections = 0
    this.consecutiveMisses = 0
  }
}
