export const FULL_RAW_RENDER_LIMIT_BYTES = 10 * 1024 * 1024;
export const RAW_CHUNK_SIZE_BYTES = 1024 * 1024;

export interface RawChunk {
  text: string;
  start: number;
  end: number;
  total: number;
  chunkIndex: number;
  chunkCount: number;
}

export interface RawReadPlan {
  mode: 'full' | 'chunked';
  chunkCount: number;
}

export function getRawReadPlan(size: number): RawReadPlan {
  if (size <= FULL_RAW_RENDER_LIMIT_BYTES) {
    return {
      mode: 'full',
      chunkCount: 1
    };
  }

  return {
    mode: 'chunked',
    chunkCount: Math.ceil(size / RAW_CHUNK_SIZE_BYTES)
  };
}

export async function readRawChunk(blob: Blob, chunkIndex: number): Promise<RawChunk> {
  const plan = getRawReadPlan(blob.size);
  const boundedChunkIndex = clampChunkIndex(chunkIndex, plan.chunkCount);
  const start = plan.mode === 'full' ? 0 : boundedChunkIndex * RAW_CHUNK_SIZE_BYTES;
  const end = Math.min(blob.size, start + RAW_CHUNK_SIZE_BYTES);
  const text = await readBlobText(blob.slice(start, end));

  return {
    text,
    start,
    end,
    total: blob.size,
    chunkIndex: boundedChunkIndex,
    chunkCount: plan.chunkCount
  };
}

function clampChunkIndex(chunkIndex: number, chunkCount: number): number {
  if (!Number.isFinite(chunkIndex) || chunkIndex < 0) {
    return 0;
  }

  return Math.min(Math.floor(chunkIndex), Math.max(0, chunkCount - 1));
}

async function readBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    });
    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('Could not read blob text'));
    });

    reader.readAsText(blob);
  });
}
