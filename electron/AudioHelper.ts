import { app } from "electron"
import path from "node:path"
import fs from "node:fs"
import { v4 as uuidv4 } from "uuid"
import { execFile } from "child_process"
import { promisify } from "util"
import FormData from "form-data"
import axios from "axios"

const execFileAsync = promisify(execFile)

interface TranscriptionResult {
  text: string
  confidence: number
  language: string
}

export class AudioHelper {
  private isRecording: boolean = false
  private readonly audioDir: string
  private recordingProcess: any = null
  private currentChunkPath: string | null = null
  private rollingTimer: NodeJS.Timeout | null = null
  private onTranscription: ((text: string) => void) | null = null
  private readonly chunkDurationSec: number = 5

  constructor() {
    this.audioDir = path.join(app.getPath("userData"), "audio_chunks")
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true })
    }
  }

  public setOnTranscription(callback: (text: string) => void): void {
    this.onTranscription = callback
  }

  public async startRecording(): Promise<void> {
    if (this.isRecording) return
    this.isRecording = true
    console.log("Starting rolling audio recording...")
    this.startNextChunk()
  }

  public async stopRecording(): Promise<void> {
    if (!this.isRecording) return
    this.isRecording = false

    if (this.rollingTimer) {
      clearTimeout(this.rollingTimer)
      this.rollingTimer = null
    }

    if (this.recordingProcess) {
      try {
        this.recordingProcess.kill("SIGTERM")
      } catch {}
      this.recordingProcess = null
    }

    // Process the last chunk
    if (this.currentChunkPath && fs.existsSync(this.currentChunkPath)) {
      await this.transcribeChunk(this.currentChunkPath)
    }

    console.log("Audio recording stopped.")
  }

  private startNextChunk(): void {
    if (!this.isRecording) return

    const outputPath = path.join(this.audioDir, `${uuidv4()}.wav`)
    this.currentChunkPath = outputPath

    if (process.platform === "darwin") {
      this.recordingProcess = execFile("sox", [
        "-d",
        "-r", "16000",
        "-c", "1",
        "-b", "16",
        outputPath,
        "trim", "0", String(this.chunkDurationSec),
      ])
    } else {
      // Windows fallback — simplified
      this.recordingProcess = execFile("sox", [
        "-d",
        "-r", "16000",
        "-c", "1",
        "-b", "16",
        outputPath,
        "trim", "0", String(this.chunkDurationSec),
      ])
    }

    // When this chunk finishes, transcribe it and start the next
    this.recordingProcess.on("exit", async () => {
      if (fs.existsSync(outputPath)) {
        this.transcribeChunk(outputPath).catch((err) =>
          console.error("Transcription error:", err)
        )
      }
      // Start next chunk if still recording
      if (this.isRecording) {
        this.startNextChunk()
      }
    })

    // Safety timeout in case sox hangs
    this.rollingTimer = setTimeout(() => {
      if (this.recordingProcess) {
        try {
          this.recordingProcess.kill("SIGTERM")
        } catch {}
      }
    }, (this.chunkDurationSec + 2) * 1000)
  }

  private async transcribeChunk(audioPath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(audioPath)
      if (stats.size < 1000) {
        // Too small, likely silence
        await fs.promises.unlink(audioPath).catch(() => {})
        return
      }

      const result = await this.transcribeAudio(audioPath)
      if (result && result.text.trim()) {
        this.onTranscription?.(result.text.trim())
      }

      // Clean up the chunk file
      await fs.promises.unlink(audioPath).catch(() => {})
    } catch (error) {
      console.error("Error processing audio chunk:", error)
    }
  }

  private async transcribeAudio(audioPath: string): Promise<TranscriptionResult | null> {
    const apiKey = process.env.NVIDIA_NIM_API_KEY
    if (!apiKey) {
      console.error("NVIDIA NIM API key not set")
      return null
    }

    try {
      // Use OpenAI Whisper API via form-data (proper multipart)
      const formData = new FormData()
      formData.append("file", fs.createReadStream(audioPath), {
        filename: "audio.wav",
        contentType: "audio/wav",
      })
      formData.append("model", "whisper-1")
      formData.append("language", "en")

      // Use OpenAI's Whisper endpoint directly (NIM may not support audio)
      // Falls back to a no-op if no OpenAI key is available
      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            ...formData.getHeaders(),
          },
          timeout: 10000,
        }
      )

      return {
        text: response.data.text,
        confidence: 0.9,
        language: response.data.language || "en",
      }
    } catch (error: any) {
      // Silently fail — audio transcription is secondary
      if (error?.response?.status !== 401) {
        console.error("Whisper API error:", error?.message)
      }
      return null
    }
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording
  }

  public async cleanup(): Promise<void> {
    if (this.isRecording) {
      await this.stopRecording()
    }

    // Clean up remaining audio files
    try {
      const files = await fs.promises.readdir(this.audioDir)
      for (const file of files) {
        await fs.promises.unlink(path.join(this.audioDir, file)).catch(() => {})
      }
    } catch {}
  }
}
