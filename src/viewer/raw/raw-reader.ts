export const FULL_RAW_RENDER_LIMIT_BYTES = 10 * 1024 * 1024;
export const RAW_CHUNK_SIZE_BYTES = 1024 * 1024;

export interface RawChunk {
  text: string;
  start: number;
  end: number;
  total: number;
}

export async function readRawChunk(blob: Blob, chunkIndex: number): Promise<RawChunk> {
  const start = Math.max(0, chunkIndex) * RAW_CHUNK_SIZE_BYTES;
  const end = Math.min(blob.size, start + RAW_CHUNK_SIZE_BYTES);
  const text = await blob.slice(start, end).text();

  return {
    text,
    start,
    end,
    total: blob.size
  };
}
