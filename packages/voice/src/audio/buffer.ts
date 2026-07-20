/**
 * Pre-allocated AudioRingBuffer designed to store streaming Float32Array PCM frames,
 * managing indices wrapping and zero-garbage-collection RMS level estimations.
 */
export class AudioRingBuffer {
  private buffer: Float32Array;
  private capacity: number;
  private writePointer = 0;
  private isFull = false;

  constructor(capacity = 8192) {
    this.capacity = capacity;
    this.buffer = new Float32Array(capacity);
  }

  /**
   * Pushes a new chunk of PCM samples into the circular buffer.
   */
  public write(data: Float32Array): void {
    if (data.length > this.capacity) {
      // If chunk is larger than buffer capacity, only write last part
      const slice = data.subarray(data.length - this.capacity);
      this.buffer.set(slice, 0);
      this.writePointer = 0;
      this.isFull = true;
      return;
    }

    const availableSpace = this.capacity - this.writePointer;
    if (data.length <= availableSpace) {
      this.buffer.set(data, this.writePointer);
      this.writePointer = (this.writePointer + data.length) % this.capacity;
      if (this.writePointer === 0) {
        this.isFull = true;
      }
    } else {
      // Split write across index wrap boundaries
      const firstPart = data.subarray(0, availableSpace);
      const secondPart = data.subarray(availableSpace);
      
      this.buffer.set(firstPart, this.writePointer);
      this.buffer.set(secondPart, 0);
      this.writePointer = secondPart.length;
      this.isFull = true;
    }
  }

  /**
   * Returns a copy of the active buffer contents.
   */
  public readAll(): Float32Array {
    if (!this.isFull) {
      const copy = new Float32Array(this.writePointer);
      copy.set(this.buffer.subarray(0, this.writePointer), 0);
      return copy;
    }

    const copy = new Float32Array(this.capacity);
    // Align order: oldest data first
    const part1 = this.buffer.subarray(this.writePointer);
    const part2 = this.buffer.subarray(0, this.writePointer);
    copy.set(part1, 0);
    copy.set(part2, part1.length);
    return copy;
  }

  /**
   * Estimates the current Root Mean Square (RMS) level directly on the pre-allocated circular buffer.
   * Eliminates garbage collection cycles during continuous streaming checks.
   */
  public calculateRMS(): number {
    const limit = this.isFull ? this.capacity : this.writePointer;
    if (limit === 0) return 0.0;

    let sum = 0.0;
    for (let i = 0; i < limit; i++) {
      const sample = this.buffer[i];
      if (sample !== undefined) {
        sum += sample * sample;
      }
    }
    return Math.sqrt(sum / limit);
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public size(): number {
    return this.isFull ? this.capacity : this.writePointer;
  }

  public clear(): void {
    this.buffer.fill(0);
    this.writePointer = 0;
    this.isFull = false;
  }
}
