import { useEffect, useMemo, useRef, useState } from 'react';
import { PRODUCT_NAME, TAGLINE } from '../shared/constants';
import { formatBytes } from '../shared/format-bytes';
import { DataTable } from './components/DataTable';
import { DropZone } from './components/DropZone';
import { ErrorState } from './components/ErrorState';
import { LargeFileDialog } from './components/LargeFileDialog';
import { Pagination } from './components/Pagination';
import { RawView } from './components/RawView';
import { createDuckDbTableEngine } from './engine/duckdb-engine';
import type { PageRequest, RowserTableEngine, TableMetadata, TablePage } from './engine/engine-types';
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

type TableState =
  | { status: 'idle' }
  | { status: 'importing' }
  | { status: 'querying'; metadata: TableMetadata | null }
  | { status: 'ready'; metadata: TableMetadata; page: TablePage }
  | { status: 'error'; title: string; detail: string; metadata: TableMetadata | null };

const DEFAULT_PAGE_REQUEST: PageRequest = {
  page: 0,
  pageSize: 100,
  search: '',
  sort: null
};

export function App() {
  const [mode, setMode] = useState<Mode>('table');
  const [wrapRaw, setWrapRaw] = useState(false);
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [tableState, setTableState] = useState<TableState>({ status: 'idle' });
  const [pageRequest, setPageRequest] = useState<PageRequest>(DEFAULT_PAGE_REQUEST);
  const [queryRequest, setQueryRequest] = useState<PageRequest>(DEFAULT_PAGE_REQUEST);
  const tableEngineRef = useRef<RowserTableEngine | null>(null);

  const params = useMemo(() => new URLSearchParams(location.search), []);

  function acceptSource(source: RowserSource) {
    const decision = getFileSizeDecision(source.size);

    if (decision.kind === 'none') {
      setState({ status: 'ready', source });
      setPageRequest(DEFAULT_PAGE_REQUEST);
      setQueryRequest(DEFAULT_PAGE_REQUEST);
      setTableState({ status: 'idle' });
      return;
    }

    setState({ status: 'deciding-large-file', source, decision });
  }

  function resetViewer() {
    void tableEngineRef.current?.dispose();
    tableEngineRef.current = null;
    setMode('table');
    setWrapRaw(false);
    setState({ status: 'idle' });
    setTableState({ status: 'idle' });
    setPageRequest(DEFAULT_PAGE_REQUEST);
    setQueryRequest(DEFAULT_PAGE_REQUEST);
  }

  useEffect(() => {
    return () => {
      void tableEngineRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setQueryRequest(pageRequest), 300);
    return () => window.clearTimeout(timeout);
  }, [pageRequest]);

  useEffect(() => {
    if (state.status !== 'ready') {
      void tableEngineRef.current?.dispose();
      tableEngineRef.current = null;
      setTableState({ status: 'idle' });
      return;
    }

    if (mode !== 'table') {
      return;
    }

    let active = true;

    async function loadTable(source: RowserSource) {
      const existingMetadata =
        tableState.status === 'ready' || tableState.status === 'querying' || tableState.status === 'error'
          ? tableState.metadata
          : null;

      setTableState(existingMetadata ? { status: 'querying', metadata: existingMetadata } : { status: 'importing' });

      try {
        const engine = tableEngineRef.current ?? createDuckDbTableEngine();
        tableEngineRef.current = engine;
        const metadata = existingMetadata ?? (await engine.importSource(source));
        const page = await engine.getPage(queryRequest);

        if (!active) {
          return;
        }

        setTableState({ status: 'ready', metadata, page });
      } catch (error) {
        if (!active) {
          return;
        }

        setTableState({
          status: 'error',
          title: 'Table import failed',
          detail: error instanceof Error ? error.message : String(error),
          metadata: existingMetadata
        });
      }
    }

    void loadTable(state.source);

    return () => {
      active = false;
    };
  }, [mode, queryRequest, state]);

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
            {tableState.status === 'ready'
              ? ` · ${tableState.metadata.rowCount} rows x ${tableState.page.columns.length} columns`
              : ''}
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
        {mode === 'table' && state.status === 'ready' ? (
          <input
            className="viewer__search"
            type="search"
            placeholder="Search..."
            value={pageRequest.search}
            onChange={(event) =>
              setPageRequest({ ...pageRequest, page: 0, search: event.currentTarget.value })
            }
          />
        ) : null}
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
        {state.status === 'error' ? (
          <ErrorState
            title={state.title}
            detail={state.detail}
            onOpenAnotherFile={resetViewer}
          />
        ) : null}
        {state.status === 'ready' && mode === 'table' ? (
          <TablePanel
            tableState={tableState}
            pageRequest={pageRequest}
            onPageRequestChange={setPageRequest}
            onShowRaw={() => setMode('raw')}
          />
        ) : null}
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
        aria-label="Choose CSV or TSV file"
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

function TablePanel({
  tableState,
  pageRequest,
  onPageRequestChange,
  onShowRaw
}: {
  tableState: TableState;
  pageRequest: PageRequest;
  onPageRequestChange: (request: PageRequest) => void;
  onShowRaw: () => void;
}) {
  if (tableState.status === 'importing') {
    return <Status label="Importing into DuckDB" />;
  }

  if (tableState.status === 'querying') {
    return <Status label="Running query" />;
  }

  if (tableState.status === 'error') {
    return (
      <ErrorState
        title={tableState.title}
        detail={tableState.detail}
        onShowRaw={onShowRaw}
      />
    );
  }

  if (tableState.status !== 'ready') {
    return <Status label="Preparing table" />;
  }

  return (
    <div className="table-view">
      {tableState.metadata.importNotice ? (
        <p className="table-notice">{tableState.metadata.importNotice}</p>
      ) : null}
      <DataTable
        page={tableState.page}
        sort={pageRequest.sort}
        onSortChange={(sort) => onPageRequestChange({ ...pageRequest, page: 0, sort })}
      />
      <Pagination
        page={tableState.page}
        request={pageRequest}
        onRequestChange={onPageRequestChange}
      />
    </div>
  );
}
