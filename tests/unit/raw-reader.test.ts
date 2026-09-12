import { describe, expect, it } from 'vitest';
import {
  FULL_RAW_RENDER_LIMIT_BYTES,
  RAW_CHUNK_SIZE_BYTES,
  getRawReadPlan,
  readRawChunk
} from '../../extension/shared/src/viewer/raw/raw-reader';

describe('raw-reader', () => {
  it('plans full rendering up to 10 MB', () => {
    expect(getRawReadPlan(FULL_RAW_RENDER_LIMIT_BYTES)).toEqual({
      mode: 'full',
      chunkCount: 1
    });
  });

  it('plans chunked rendering above 10 MB', () => {
    expect(getRawReadPlan(FULL_RAW_RENDER_LIMIT_BYTES + 1)).toEqual({
      mode: 'chunked',
      chunkCount: 11
    });
  });

  it('reads complete text for small files as the first chunk', async () => {
    const blob = new Blob(['id,name\n1,Alice\n']);

    await expect(readRawChunk(blob, 0)).resolves.toEqual({
      text: 'id,name\n1,Alice\n',
      start: 0,
      end: 16,
      total: 16,
      chunkIndex: 0,
      chunkCount: 1
    });
  });

  it('clamps chunk indexes to the available range', async () => {
    const blob = new Blob(['x'.repeat(FULL_RAW_RENDER_LIMIT_BYTES + 5)]);

    await expect(readRawChunk(blob, 99)).resolves.toMatchObject({
      text: 'xxxxx',
      start: FULL_RAW_RENDER_LIMIT_BYTES,
      end: FULL_RAW_RENDER_LIMIT_BYTES + 5,
      total: FULL_RAW_RENDER_LIMIT_BYTES + 5,
      chunkIndex: 10,
      chunkCount: 11
    });
  });
});
