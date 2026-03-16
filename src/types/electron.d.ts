interface ElectronAPI {
  // Window management
  updateContentDimensions: (dimensions: { width: number; height: number }) => void
  openExternal: (url: string) => void

  // Meeting control
  startMeeting: () => Promise<{ success: boolean }>
  stopMeeting: () => Promise<{ success: boolean }>
  toggleMeeting: () => Promise<{ success: boolean; isActive: boolean }>
  generateSummary: () => Promise<{ success: boolean; summary: string }>
  copyNotes: () => Promise<{ success: boolean }>

  // Settings
  getSettings: () => Promise<any>
  updateSettings: (settings: any) => Promise<{ success: boolean }>
  getHasOnboarded: () => Promise<boolean>
  setHasOnboarded: (value: boolean) => Promise<{ success: boolean }>

  // Permissions
  checkPermissions: () => Promise<{ screen: boolean; microphone: boolean }>
  requestMicPermission: () => Promise<boolean>

  // Meeting status
  isMeetingRunning: () => Promise<boolean>

  // Event listeners (return cleanup function)
  onAnalysisResult: (callback: (result: any) => void) => () => void
  onTranscriptUpdate: (callback: (data: any) => void) => () => void
  onMeetingStarted: (callback: (data: any) => void) => () => void
  onMeetingEnded: (callback: (data: any) => void) => () => void
  onMeetingSummary: (callback: (summary: string) => void) => () => void
  onAlert: (callback: (data: any) => void) => () => void
  onApiStatus: (callback: (status: string) => void) => () => void
  onViewChanged: (callback: (view: string) => void) => () => void
  onToggleMiniMode: (callback: () => void) => () => void
}

interface Window {
  electronAPI: ElectronAPI
}
