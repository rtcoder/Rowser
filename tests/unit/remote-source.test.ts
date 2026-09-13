import { describe, expect, it } from 'vitest';
import {
  UnknownLengthLimitExceededError,
  readRemoteResponseBlob
} from '../../extension/shared/src/viewer/source/remote-source';

describe('remote-source', () => {
  it('aborts unknown-length response streams after the configured limit', async () => {
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.enqueue(new Uint8Array([4, 5, 6]));
          controller.close();
        }
      }),
      {
        headers: {
          'Content-Type': 'text/csv'
        }
      }
    );

    await expect(
      readRemoteResponseBlob(response, {
        allowUnknownLengthOverLimit: false,
        maxUnknownLengthBytes: 5,
        sourceName: 'large.csv',
        sourceUrl: 'https://example.com/large.csv'
      })
    ).rejects.toMatchObject({
      name: 'UnknownLengthLimitExceededError',
      sourceName: 'large.csv',
      sourceUrl: 'https://example.com/large.csv'
    });
  });

  it('can continue reading unknown-length streams when explicitly allowed', async () => {
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('name\nAda\n'));
          controller.close();
        }
      }),
      {
        headers: {
          'Content-Type': 'text/csv'
        }
      }
    );

    const blob = await readRemoteResponseBlob(response, {
      allowUnknownLengthOverLimit: true,
      maxUnknownLengthBytes: 1,
      sourceName: 'large.csv',
      sourceUrl: 'https://example.com/large.csv'
    });

    expect(blob.size).toBe(9);
    expect(await blob.text()).toBe('name\nAda\n');
  });

  it('uses a specific error type for unknown-length limit decisions', () => {
    const error = new UnknownLengthLimitExceededError(
      'https://example.com/large.csv',
      'large.csv'
    );

    expect(error.message).toBe(
      "This file is larger than Rowser's recommended 512 MB limit. Table mode may fail because of browser memory limits."
    );
  });
});
