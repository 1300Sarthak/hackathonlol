export class FrameDiffHelper {
  private lastFrameBuffer: Buffer | null = null
  private readonly threshold: number

  constructor(threshold: number = 0.15) {
    this.threshold = threshold
  }

  public hasSignificantChange(newBuffer: Buffer): boolean {
    if (!this.lastFrameBuffer) {
      this.lastFrameBuffer = newBuffer
      return true
    }

    const diff = this.computeDiff(this.lastFrameBuffer, newBuffer)
    this.lastFrameBuffer = newBuffer

    return diff > this.threshold
  }

  private computeDiff(bufferA: Buffer, bufferB: Buffer): number {
    const sampleSize = 500
    const lenA = bufferA.length
    const lenB = bufferB.length

    // If sizes differ significantly, it's a new frame
    if (Math.abs(lenA - lenB) / Math.max(lenA, lenB) > 0.1) {
      return 1.0
    }

    const minLen = Math.min(lenA, lenB)
    const step = Math.max(1, Math.floor(minLen / sampleSize))
    let diffCount = 0
    let totalSamples = 0

    for (let i = 0; i < minLen; i += step) {
      const diff = Math.abs(bufferA[i] - bufferB[i])
      if (diff > 20) {
        diffCount++
      }
      totalSamples++
    }

    return totalSamples > 0 ? diffCount / totalSamples : 1.0
  }

  public reset(): void {
    this.lastFrameBuffer = null
  }
}
