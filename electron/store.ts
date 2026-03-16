import Store from "electron-store"

interface MeetingSettings {
  analysisFrequencyMs: number
  audioEnabled: boolean
  autoDetect: boolean
  theme: "dark" | "darker" | "dim"
}

interface StoreSchema {
  hasOnboarded: boolean
  settings: MeetingSettings
}

const storeInstance = new Store<StoreSchema>({
  defaults: {
    hasOnboarded: false,
    settings: {
      analysisFrequencyMs: 2000,
      audioEnabled: true,
      autoDetect: true,
      theme: "dark",
    },
  },
  encryptionKey: "social-translator-key",
}) as any

export const store = {
  get(key: keyof StoreSchema): any {
    return storeInstance.get(key)
  },
  set(key: keyof StoreSchema, value: any): void {
    storeInstance.set(key, value)
  },
}
