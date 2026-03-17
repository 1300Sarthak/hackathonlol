import { useEffect, useRef, useCallback } from "react"

/**
 * Uses the browser's built-in Web Speech API (via Chromium in Electron)
 * for real-time, free speech-to-text transcription.
 *
 * This replaces the sox + OpenAI Whisper approach which required
 * a separate API key and had 5-second latency.
 */
export function useSpeechRecognition(isActive: boolean) {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isRunningRef = useRef(false)
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFinalRef = useRef("")

  const startRecognition = useCallback(() => {
    if (isRunningRef.current) return

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionClass) {
      console.warn("[SpeechRecognition] Not available in this browser/environment")
      return
    }

    try {
      const recognition = new SpeechRecognitionClass()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        isRunningRef.current = true
        console.log("[SpeechRecognition] Started listening")
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = result[0].transcript

          if (result.isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        // Send final transcripts to main process
        if (finalTranscript.trim() && finalTranscript.trim() !== lastFinalRef.current) {
          lastFinalRef.current = finalTranscript.trim()
          window.electronAPI?.sendTranscript(finalTranscript.trim())
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn("[SpeechRecognition] Error:", event.error)
        isRunningRef.current = false

        // Auto-restart on recoverable errors
        if (event.error === "no-speech" || event.error === "aborted" || event.error === "network") {
          scheduleRestart()
        }
      }

      recognition.onend = () => {
        isRunningRef.current = false
        // Auto-restart if we should still be listening
        if (isActive) {
          scheduleRestart()
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.error("[SpeechRecognition] Failed to start:", err)
      isRunningRef.current = false
    }
  }, [isActive])

  const scheduleRestart = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
    }
    restartTimeoutRef.current = setTimeout(() => {
      if (isActive && !isRunningRef.current) {
        startRecognition()
      }
    }, 500)
  }, [isActive, startRecognition])

  const stopRecognition = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null // Prevent auto-restart
        recognitionRef.current.stop()
      } catch {}
      recognitionRef.current = null
    }
    isRunningRef.current = false
    lastFinalRef.current = ""
  }, [])

  useEffect(() => {
    if (isActive) {
      startRecognition()
    } else {
      stopRecognition()
    }

    return () => {
      stopRecognition()
    }
  }, [isActive, startRecognition, stopRecognition])
}
