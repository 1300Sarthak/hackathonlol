import { contextBridge, ipcRenderer } from "electron"
const { shell } = require("electron")

export const EVENTS = {
  ANALYSIS_RESULT: "analysis-result",
  TRANSCRIPT_UPDATE: "transcript-update",
  MEETING_STARTED: "meeting-started",
  MEETING_ENDED: "meeting-ended",
  MEETING_SUMMARY: "meeting-summary",
  ALERT: "meeting-alert",
  API_STATUS: "api-status",
  VIEW_CHANGED: "view-changed",
  TOGGLE_MINI_MODE: "toggle-mini-mode",
} as const

function onEvent(eventName: string, callback: (...args: any[]) => void): () => void {
  const subscription = (_: any, ...args: any[]) => callback(...args)
  ipcRenderer.on(eventName, subscription)
  return () => {
    ipcRenderer.removeListener(eventName, subscription)
  }
}

contextBridge.exposeInMainWorld("electronAPI", {
  // Window management
  updateContentDimensions: (dimensions: { width: number; height: number }) =>
    ipcRenderer.invoke("update-content-dimensions", dimensions),
  openExternal: (url: string) => shell.openExternal(url),

  // Meeting control
  startMeeting: () => ipcRenderer.invoke("start-meeting"),
  stopMeeting: () => ipcRenderer.invoke("stop-meeting"),
  toggleMeeting: () => ipcRenderer.invoke("toggle-meeting"),
  generateSummary: () => ipcRenderer.invoke("generate-summary"),
  copyNotes: () => ipcRenderer.invoke("copy-notes"),

  // Settings
  getSettings: () => ipcRenderer.invoke("get-settings"),
  updateSettings: (settings: any) => ipcRenderer.invoke("update-settings", settings),
  getHasOnboarded: () => ipcRenderer.invoke("get-has-onboarded"),
  setHasOnboarded: (value: boolean) => ipcRenderer.invoke("set-has-onboarded", value),

  // Permissions
  checkPermissions: () => ipcRenderer.invoke("check-permissions"),
  requestMicPermission: () => ipcRenderer.invoke("request-mic-permission"),

  // Meeting status
  isMeetingRunning: () => ipcRenderer.invoke("is-meeting-running"),

  // Event listeners
  onAnalysisResult: (callback: (result: any) => void) =>
    onEvent(EVENTS.ANALYSIS_RESULT, callback),
  onTranscriptUpdate: (callback: (data: any) => void) =>
    onEvent(EVENTS.TRANSCRIPT_UPDATE, callback),
  onMeetingStarted: (callback: (data: any) => void) =>
    onEvent(EVENTS.MEETING_STARTED, callback),
  onMeetingEnded: (callback: (data: any) => void) =>
    onEvent(EVENTS.MEETING_ENDED, callback),
  onMeetingSummary: (callback: (summary: string) => void) =>
    onEvent(EVENTS.MEETING_SUMMARY, callback),
  onAlert: (callback: (data: any) => void) =>
    onEvent(EVENTS.ALERT, callback),
  onApiStatus: (callback: (status: string) => void) =>
    onEvent(EVENTS.API_STATUS, callback),
  onViewChanged: (callback: (view: string) => void) =>
    onEvent(EVENTS.VIEW_CHANGED, callback),
  onToggleMiniMode: (callback: () => void) =>
    onEvent(EVENTS.TOGGLE_MINI_MODE, callback),
})

ipcRenderer.on("restore-focus", () => {
  const activeElement = document.activeElement as HTMLElement
  if (activeElement && typeof activeElement.focus === "function") {
    activeElement.focus()
  }
})
