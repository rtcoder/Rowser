import { useEffect, useMemo, useState } from 'react';
import { consumeNavigationHandoff } from '../background/handoff-store';
import { PRODUCT_NAME, TAGLINE } from '../shared/constants';
import { formatBytes } from '../shared/format-bytes';
import { loadLocalSource } from './source/local-source';
import { loadRemoteSource } from './source/remote-source';
import type { RowserSource } from './source/source-types';

type Mode = 'table' | 'raw';
type LoadState =
  | { status: 'idle' }
  | { status: 'loading'; label: string }
  | { status: 'ready'; source: RowserSource; rawText: string | null }
  | { status: 'error'; title: string; detail: string };

export function App() {
  const [mode, setMode] = useState<Mode>('table');
  const [wrapRaw, setWrapRaw] = useState(false);
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  const params = useMemo(() => new URLSearchParams(location.search), []);

  useEffect(() => {
    const token = params.get('token');
    const directUrl = params.get('url');
    if (!directUrl && !token) {
      return;
    }

    const controller = new AbortController();
    setState({ status: 'loading', label: 'Loading source' });

    const resolveUrl = async () => {
      if (directUrl) {
        return directUrl;
      }

      const handoff = await consumeNavigationHandoff(token as string);
      if (!handoff) {
        throw new Error('Expired automatic-navigation token');
      }

      return handoff.sourceUrl;
    };

    void resolveUrl()
      .then((url) => loadRemoteSource(url, controller.signal))
      .then(async (source) => {
        setState({ status: 'ready', source, rawText: await source.blob.text() });
      })
      .catch((error: unknown) => {
        setState({
          status: 'error',
          title: 'Network request failed',
          detail: error instanceof Error ? error.message : String(error)
        });
      });

    return () => controller.abort();
  }, [params]);

  async function handleFile(file: File) {
    setState({ status: 'loading', label: 'Loading local file' });

    try {
      const source = await loadLocalSource(file);
      setState({ status: 'ready', source, rawText: await source.blob.text() });
    } catch (error) {
      setState({
        status: 'error',
        title: 'Could not open file',
        detail: error instanceof Error ? error.message : String(error)
      });
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files.item(0);
    if (file) {
      void handleFile(file);
    }
  }

  return (
    <main className="viewer" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <header className="viewer__header">
        <div>
          <strong>{PRODUCT_NAME}</strong>
          <span>{TAGLINE}</span>
        </div>
        {state.status === 'ready' ? (
          <p>
            {state.source.name} · {formatBytes(state.source.size)}
          </p>
        ) : null}
      </header>

      <nav className="viewer__toolbar" aria-label="Viewer mode">
        <button
          type="button"
          className={mode === 'table' ? 'is-active' : ''}
          onClick={() => setMode('table')}
        >
          Table
        </button>
        <button
          type="button"
          className={mode === 'raw' ? 'is-active' : ''}
          onClick={() => setMode('raw')}
        >
          Raw
        </button>
        {mode === 'raw' ? (
          <label className="viewer__wrap">
            <input
              type="checkbox"
              checked={wrapRaw}
              onChange={(event) => setWrapRaw(event.currentTarget.checked)}
            />
            Wrap lines
          </label>
        ) : null}
      </nav>

      <section className="viewer__body">
        {state.status === 'idle' ? <FilePrompt onFile={handleFile} localMode={params.get('mode') === 'local'} /> : null}
        {state.status === 'loading' ? <Status label={state.label} /> : null}
        {state.status === 'error' ? <ErrorState title={state.title} detail={state.detail} /> : null}
        {state.status === 'ready' && mode === 'table' ? <TablePlaceholder source={state.source} /> : null}
        {state.status === 'ready' && mode === 'raw' ? (
          <pre className={wrapRaw ? 'raw raw--wrap' : 'raw'}>{state.rawText}</pre>
        ) : null}
      </section>
    </main>
  );
}

function FilePrompt({
  localMode,
  onFile
}: {
  localMode: boolean;
  onFile: (file: File) => Promise<void>;
}) {
  return (
    <div className="empty-state">
      <p>{localMode ? 'Choose a CSV or TSV file.' : 'Open a CSV or TSV URL from the popup, or drop a file here.'}</p>
      <input
        type="file"
        accept=".csv,.tsv,text/csv,text/tab-separated-values"
        onChange={(event) => {
          const file = event.currentTarget.files?.item(0);
          if (file) {
            void onFile(file);
          }
        }}
      />
    </div>
  );
}

function Status({ label }: { label: string }) {
  return <div className="empty-state">{label}...</div>;
}

function ErrorState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="error-state">
      <h2>{title}</h2>
      <p>{detail}</p>
    </div>
  );
}

function TablePlaceholder({ source }: { source: RowserSource }) {
  return (
    <div className="table-placeholder">
      <p>Table mode will import {source.name} into DuckDB-WASM in the next implementation task.</p>
    </div>
  );
}
