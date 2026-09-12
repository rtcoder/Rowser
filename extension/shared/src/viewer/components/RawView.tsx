import { useEffect, useState } from 'react';
import { readRawChunk, type RawChunk } from '../raw/raw-reader';
import type { RowserSource } from '../source/source-types';

interface RawViewProps {
  source: RowserSource;
  wrapLines: boolean;
}

export function RawView({ source, wrapLines }: RawViewProps) {
  const [chunkIndex, setChunkIndex] = useState(0);
  const [chunk, setChunk] = useState<RawChunk | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);

    void readRawChunk(source.blob, chunkIndex)
      .then((nextChunk) => {
        if (!active) {
          return;
        }

        setChunk(nextChunk);
        if (nextChunk.chunkIndex !== chunkIndex) {
          setChunkIndex(nextChunk.chunkIndex);
        }
      })
      .catch((rawError: unknown) => {
        if (!active) {
          return;
        }

        setError(rawError instanceof Error ? rawError.message : String(rawError));
      });

    return () => {
      active = false;
    };
  }, [chunkIndex, source]);

  if (error) {
    return <p className="raw-status">Could not read raw source: {error}</p>;
  }

  if (!chunk) {
    return <p className="raw-status">Loading raw source...</p>;
  }

  const isChunked = chunk.chunkCount > 1;

  return (
    <div className="raw-view">
      {isChunked ? (
        <div className="raw-controls">
          <span>
            Bytes {chunk.start + 1}-{chunk.end} of {chunk.total}
          </span>
          <button
            type="button"
            disabled={chunk.chunkIndex === 0}
            onClick={() => setChunkIndex((current) => current - 1)}
          >
            Previous chunk
          </button>
          <button
            type="button"
            disabled={chunk.chunkIndex >= chunk.chunkCount - 1}
            onClick={() => setChunkIndex((current) => current + 1)}
          >
            Next chunk
          </button>
        </div>
      ) : null}
      <pre className={wrapLines ? 'raw raw--wrap' : 'raw'}>{chunk.text}</pre>
    </div>
  );
}
