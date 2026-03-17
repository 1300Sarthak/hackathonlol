import { ipcMain } from "electron"
import { AppState } from "./main"

export function initializeIpcHandlers(appState: AppState): void {
  ipcMain.handle(
    "update-content-dimensions",
    async (_event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        appState.setWindowDimensions(width, height)
      }
    }
  )

  // Meeting control
  ipcMain.handle("start-meeting", async () => {
    await appState.startMeetingAnalysis()
    return { success: true }
  })

  ipcMain.handle("stop-meeting", async () => {
    await appState.stopMeetingAnalysis()
    return { success: true }
  })

  ipcMain.handle("toggle-meeting", async () => {
    await appState.toggleMeetingAnalysis()
    return { success: true, isActive: appState.isMeetingRunning() }
  })

  ipcMain.handle("generate-summary", async () => {
    const summary = await appState.generateMeetingSummary()
    return { success: true, summary }
  })

  ipcMain.handle("copy-notes", async () => {
    appState.copyNotesToClipboard()
    return { success: true }
  })

  // Settings
  ipcMain.handle("get-settings", async () => {
    return appState.getSettings()
  })

  ipcMain.handle("update-settings", async (_event, settings: any) => {
    appState.updateSettings(settings)
    return { success: true }
  })

  ipcMain.handle("get-has-onboarded", async () => {
    return appState.getHasOnboarded()
  })

  ipcMain.handle("set-has-onboarded", async (_event, value: boolean) => {
    appState.setHasOnboarded(value)
    return { success: true }
  })

  // Permissions
  ipcMain.handle("check-permissions", async () => {
    return appState.checkPermissions()
  })

  ipcMain.handle("request-mic-permission", async () => {
    return await appState.requestMicPermission()
  })

  // Meeting status
  ipcMain.handle("is-meeting-running", async () => {
    return appState.isMeetingRunning()
  })

  // Renderer-side speech recognition sends transcripts here
  ipcMain.handle("send-transcript", async (_event, text: string, speaker?: string) => {
    appState.handleRendererTranscript(text, speaker)
    return { success: true }
  })
}
