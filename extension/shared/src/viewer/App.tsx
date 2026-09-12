import { useEffect, useMemo, useState } from 'react';
import { PRODUCT_NAME, TAGLINE } from '../shared/constants';
import { formatBytes } from '../shared/format-bytes';
import { DropZone } from './components/DropZone';
import { ErrorState } from './components/ErrorState';
import { LargeFileDialog } from './components/LargeFileDialog';
import { RawView } from './components/RawView';
import { consumeNavigationHandoff } from './handoff/navigation-handoff';
import { loadLocalSource } from './source/local-source';
import { loadRemoteSource } from './source/remote-source';
import type { RowserSource } from './source/source-types';
import { getFileSizeDecision, type FileSizeDecision } from './state/file-size-policy';

type Mode = 'table' | 'raw';
type LoadState =
  | { status: 'idle' }
  | { status: 'loading'; label: string }
  | {
      status: 'deciding-large-file';
      source: RowserSource;
      decision: Exclude<FileSizeDecision, { kind: 'none' }>;
    }
  | { status: 'ready'; source: RowserSource }
  | { status: 'error'; title: string; detail: string };

export function App() {
  const [mode, setMode] = useState<Mode>('table');
  const [wrapRaw, setWrapRaw] = useState(false);
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  const params = useMemo(() => new URLSearchParams(location.search), []);

  function acceptSource(source: RowserSource) {
    const decision = getFileSizeDecision(source.size);

    if (decision.kind === 'none') {
      setState({ status: 'ready', source });
      return;
    }

    setState({ status: 'deciding-large-file', source, decision });
  }

  useEffect(() => {
    const token = params.get('token');
    const directUrl = params.get('url');
    const hashUrl = location.hash.startsWith('#http') ? location.hash.slice(1) : null;
    if (!directUrl && !token && !hashUrl) {
      return;
    }

    const controller = new AbortController();
    setState({ status: 'loading', label: 'Loading source' });

    const resolveUrl = async () => {
      if (hashUrl) {
        return hashUrl;
      }

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
      .then((source) => {
        acceptSource(source);
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
      acceptSource(source);
    } catch (error) {
      setState({
        status: 'error',
        title: 'Could not open file',
        detail: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return (
    <DropZone onFile={(file) => void handleFile(file)}>
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
        {state.status === 'idle' ? (
          <FilePrompt onFile={handleFile} localMode={params.get('mode') === 'local'} />
        ) : null}
        {state.status === 'loading' ? <Status label={state.label} /> : null}
        {state.status === 'deciding-large-file' ? (
          <LargeFileDialog
            decision={state.decision}
            sourceName={state.source.name}
            onOpenTable={() => {
              setMode('table');
              setState({ status: 'ready', source: state.source });
            }}
            onShowRaw={() => {
              setMode('raw');
              setState({ status: 'ready', source: state.source });
            }}
            onCancel={() => setState({ status: 'idle' })}
          />
        ) : null}
        {state.status === 'error' ? <ErrorState title={state.title} detail={state.detail} /> : null}
        {state.status === 'ready' && mode === 'table' ? <TablePlaceholder source={state.source} /> : null}
        {state.status === 'ready' && mode === 'raw' ? (
          <RawView source={state.source} wrapLines={wrapRaw} />
        ) : null}
      </section>
    </DropZone>
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
      <p>
        {localMode
          ? 'Choose a CSV or TSV file.'
          : 'Open a CSV or TSV URL from the popup, or drop a file here.'}
      </p>
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

function TablePlaceholder({ source }: { source: RowserSource }) {
  return (
    <div className="table-placeholder">
      <p>
        Table mode will import {source.name} into DuckDB-WASM in the next implementation task.
      </p>
    </div>
  );
}
