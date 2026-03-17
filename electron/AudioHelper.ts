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
  private onTranscription: ((text: string, speaker?: string) => void) | null = null
  private readonly chunkDurationSec: number = 3 // Shorter chunks for more real-time feel
  private lastTranscriptText: string = "" // Dedup consecutive identical transcripts
  private transcriptBuffer: string[] = [] // Rolling buffer for context

  constructor() {
    this.audioDir = path.join(app.getPath("userData"), "audio_chunks")
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true })
    }
  }

  public setOnTranscription(callback: (text: string, speaker?: string) => void): void {
    this.onTranscription = callback
  }

  public async startRecording(): Promise<void> {
    if (this.isRecording) return
    this.isRecording = true
    this.lastTranscriptText = ""
    this.transcriptBuffer = []
    console.log("Starting rolling audio recording (3s chunks)...")
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

    // Record with noise reduction for clearer audio
    const soxArgs = [
      "-d",
      "-r", "16000",
      "-c", "1",
      "-b", "16",
      outputPath,
      "trim", "0", String(this.chunkDurationSec),
      // Apply basic noise gate to reduce background noise
      "silence", "1", "0.1", "1%",
    ]

    this.recordingProcess = execFile("sox", soxArgs)

    // When this chunk finishes, transcribe it and start the next
    this.recordingProcess.on("exit", async () => {
      if (fs.existsSync(outputPath)) {
        this.transcribeChunk(outputPath).catch((err) =>
          console.error("Transcription error:", err)
        )
      }
      // Start next chunk immediately if still recording
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
      if (stats.size < 800) {
        // Too small, likely silence
        await fs.promises.unlink(audioPath).catch(() => {})
        return
      }

      const result = await this.transcribeAudio(audioPath)
      if (result && result.text.trim()) {
        const text = result.text.trim()

        // Dedup: skip if identical to last transcript (common with silence/noise)
        if (text === this.lastTranscriptText) {
          await fs.promises.unlink(audioPath).catch(() => {})
          return
        }

        // Skip very short noise artifacts
        if (text.length < 3 || text === "you" || text === "the" || text === "a") {
          await fs.promises.unlink(audioPath).catch(() => {})
          return
        }

        this.lastTranscriptText = text

        // Add to rolling buffer for context
        this.transcriptBuffer.push(text)
        if (this.transcriptBuffer.length > 30) {
          this.transcriptBuffer = this.transcriptBuffer.slice(-30)
        }

        this.onTranscription?.(text)
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
      const formData = new FormData()
      formData.append("file", fs.createReadStream(audioPath), {
        filename: "audio.wav",
        contentType: "audio/wav",
      })
      formData.append("model", "whisper-1")
      formData.append("language", "en")
      // Request word-level timestamps for better accuracy
      formData.append("response_format", "verbose_json")
      formData.append("timestamp_granularities[]", "word")
      // Provide context from recent transcripts to improve accuracy
      if (this.transcriptBuffer.length > 0) {
        const context = this.transcriptBuffer.slice(-5).join(". ")
        formData.append("prompt", context)
      }

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

      const text = typeof response.data === "string"
        ? response.data
        : response.data.text || ""

      return {
        text,
        confidence: response.data.confidence || 0.9,
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

  public getRecentTranscripts(): string[] {
    return [...this.transcriptBuffer]
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
