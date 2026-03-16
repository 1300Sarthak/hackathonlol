import path from "node:path"
import fs from "node:fs"
import { app } from "electron"
import { v4 as uuidv4 } from "uuid"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export class ScreenshotHelper {
  private screenshotQueue: string[] = []
  private readonly MAX_SCREENSHOTS = 5
  private readonly screenshotDir: string

  constructor() {
    this.screenshotDir = path.join(app.getPath("userData"), "screenshots")
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true })
    }
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotQueue
  }

  public clearQueues(): void {
    this.screenshotQueue.forEach((screenshotPath) => {
      fs.unlink(screenshotPath, (err) => {
        if (err) console.error(`Error deleting screenshot at ${screenshotPath}:`, err)
      })
    })
    this.screenshotQueue = []
  }

  private async captureScreenshotMac(): Promise<Buffer> {
    const tmpPath = path.join(app.getPath("temp"), `${uuidv4()}.png`)
    await execFileAsync("screencapture", ["-x", tmpPath])
    const buffer = await fs.promises.readFile(tmpPath)
    await fs.promises.unlink(tmpPath)
    return buffer
  }

  private async captureScreenshotWindows(): Promise<Buffer> {
    const tmpPath = path.join(app.getPath("temp"), `${uuidv4()}.png`)
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)
      $bitmap.Save('${tmpPath.replace(/\\/g, "\\\\")}')
      $graphics.Dispose()
      $bitmap.Dispose()
    `
    await execFileAsync("powershell", ["-command", script])
    const buffer = await fs.promises.readFile(tmpPath)
    await fs.promises.unlink(tmpPath)
    return buffer
  }

  /** Capture screen and return raw buffer + base64 without saving to disk */
  public async captureToBuffer(
    hideMainWindow: () => void,
    showMainWindow: () => void
  ): Promise<{ buffer: Buffer; base64: string }> {
    hideMainWindow()
    await new Promise((resolve) => setTimeout(resolve, 100))

    try {
      const buffer =
        process.platform === "darwin"
          ? await this.captureScreenshotMac()
          : await this.captureScreenshotWindows()

      const base64 = buffer.toString("base64")
      return { buffer, base64 }
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 50))
      showMainWindow()
    }
  }

  /** Capture and save to disk (for debugging / file-based workflows) */
  public async takeScreenshot(
    hideMainWindow: () => void,
    showMainWindow: () => void
  ): Promise<string> {
    hideMainWindow()
    await new Promise((resolve) => setTimeout(resolve, 100))

    let screenshotPath = ""
    try {
      const screenshotBuffer =
        process.platform === "darwin"
          ? await this.captureScreenshotMac()
          : await this.captureScreenshotWindows()

      screenshotPath = path.join(this.screenshotDir, `${uuidv4()}.png`)
      await fs.promises.writeFile(screenshotPath, screenshotBuffer)

      this.screenshotQueue.push(screenshotPath)
      if (this.screenshotQueue.length > this.MAX_SCREENSHOTS) {
        const removedPath = this.screenshotQueue.shift()
        if (removedPath) {
          try {
            await fs.promises.unlink(removedPath)
          } catch (error) {
            console.error("Error removing old screenshot:", error)
          }
        }
      }
    } catch (error) {
      console.error("Screenshot error:", error)
      throw error
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 50))
      showMainWindow()
    }

    return screenshotPath
  }

  public async getImagePreview(filepath: string): Promise<string> {
    try {
      const data = await fs.promises.readFile(filepath)
      return `data:image/png;base64,${data.toString("base64")}`
    } catch (error) {
      console.error("Error reading image:", error)
      throw error
    }
  }

  public async deleteScreenshot(
    screenshotPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await fs.promises.unlink(screenshotPath)
      this.screenshotQueue = this.screenshotQueue.filter(
        (filePath) => filePath !== screenshotPath
      )
      return { success: true }
    } catch (error: any) {
      console.error("Error deleting file:", error)
      return { success: false, error: error.message }
    }
  }
}
