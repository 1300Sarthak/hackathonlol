import { globalShortcut, app } from "electron"
import { AppState } from "./main"

export class ShortcutsHelper {
  private appState: AppState

  constructor(appState: AppState) {
    this.appState = appState
  }

  public registerGlobalShortcuts(): void {
    // Toggle meeting analysis
    globalShortcut.register("CommandOrControl+Shift+S", async () => {
      console.log("Toggling meeting analysis...")
      await this.appState.toggleMeetingAnalysis()
    })

    // Toggle mini mode
    globalShortcut.register("CommandOrControl+Shift+M", () => {
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send("toggle-mini-mode")
      }
    })

    // Copy meeting notes to clipboard
    globalShortcut.register("CommandOrControl+Shift+N", () => {
      this.appState.copyNotesToClipboard()
      console.log("Meeting notes copied to clipboard")
    })

    // End meeting + generate summary
    globalShortcut.register("CommandOrControl+Shift+E", async () => {
      console.log("Ending meeting and generating summary...")
      await this.appState.stopMeetingAnalysis()
      await this.appState.generateMeetingSummary()
    })

    // Toggle window visibility
    globalShortcut.register("CommandOrControl+B", () => {
      this.appState.toggleMainWindow()
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow && !this.appState.isVisible()) {
        if (process.platform === "darwin") {
          mainWindow.setAlwaysOnTop(true, "normal")
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.setAlwaysOnTop(true, "floating")
            }
          }, 100)
        }
      }
    })

    // Window movement
    globalShortcut.register("CommandOrControl+Left", () => {
      this.appState.moveWindowLeft()
    })

    globalShortcut.register("CommandOrControl+Right", () => {
      this.appState.moveWindowRight()
    })

    globalShortcut.register("CommandOrControl+Down", () => {
      this.appState.moveWindowDown()
    })

    globalShortcut.register("CommandOrControl+Up", () => {
      this.appState.moveWindowUp()
    })

    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }
}
