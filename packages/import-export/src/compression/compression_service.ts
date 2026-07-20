export interface ChunkReader {
  read(): Promise<{ value: string | undefined; done: boolean }>;
}

export interface ChunkWriter {
  write(chunk: string): Promise<void>;
}

export class LosslessCompressor {
  /**
   * Run-Length Encoding (RLE) to compress coordinate repetitions in paths and JSON structures.
   */
  public static compress(text: string): string {
    if (!text) return "";
    let result = "";
    let i = 0;
    while (i < text.length) {
      let count = 1;
      while (i + 1 < text.length && text[i] === text[i + 1] && count < 9) {
        count++;
        i++;
      }
      result += count > 1 ? count.toString() + text[i] : text[i];
      i++;
    }
    return result;
  }

  public static decompress(compressed: string): string {
    let result = "";
    let i = 0;
    while (i < compressed.length) {
      const char = compressed[i]!;
      if (char >= "2" && char <= "9") {
        const count = parseInt(char, 10);
        const target = compressed[i + 1]!;
        result += target.repeat(count);
        i += 2;
      } else {
        result += char;
        i++;
      }
    }
    return result;
  }

  /**
   * Compression streaming: reads text chunks from a stream reader and writes compressed blocks.
   */
  public static async compressStream(reader: ChunkReader, writer: ChunkWriter): Promise<void> {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        const compressed = this.compress(value);
        await writer.write(compressed);
      }
    }
  }

  public static async decompressStream(reader: ChunkReader, writer: ChunkWriter): Promise<void> {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        const decompressed = this.decompress(value);
        await writer.write(decompressed);
      }
    }
  }

  /**
   * Incremental serialization: serializes large array of canvas objects chunk-by-chunk to save memory.
   */
  public static async serializeIncremental(
    objects: any[],
    chunkSize: number,
    writer: ChunkWriter
  ): Promise<void> {
    for (let i = 0; i < objects.length; i += chunkSize) {
      const chunk = objects.slice(i, i + chunkSize);
      const serialized = JSON.stringify(chunk);
      await writer.write(serialized + "\n");
    }
  }
}
