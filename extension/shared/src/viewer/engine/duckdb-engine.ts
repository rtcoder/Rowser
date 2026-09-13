import { formatHintFromName } from '../source/source-name';
import type { RowserSource, SourceFormatHint } from '../source/source-types';
import { createDuckDbConnection } from './duckdb-loader';
import type { PageRequest, RowserTableEngine, TableMetadata, TablePage } from './engine-types';
import { buildTableQueries } from './query-builder';

const TABLE_NAME = 'rowser_data';
const INTERNAL_ROW_ID_COLUMN = '__rowser_rowid';
const TEXT_FALLBACK_NOTICE = 'Some column types could not be inferred. Rowser loaded the file as text.';

interface QueryStatement {
  query(...params: unknown[]): Promise<ArrowTableLike>;
  close(): Promise<void>;
}

interface DuckDbConnectionLike {
  query(sql: string): Promise<ArrowTableLike>;
  prepare(sql: string): Promise<QueryStatement>;
  close(): Promise<void>;
}

interface DuckDbLike {
  registerFileBuffer(name: string, buffer: Uint8Array): Promise<void>;
  dropFiles(names?: string[]): Promise<unknown>;
  terminate(): Promise<void>;
}

interface ArrowTableLike {
  toArray(): unknown[];
}

export interface DuckDbEngineDependencies {
  createConnection: () => Promise<{
    db: DuckDbLike;
    connection: DuckDbConnectionLike;
  }>;
}

export class DuckDbTableEngine implements RowserTableEngine {
  private db: DuckDbLike | null = null;
  private connection: DuckDbConnectionLike | null = null;
  private metadata: TableMetadata | null = null;
  private registeredFileName: string | null = null;

  constructor(private readonly dependencies: DuckDbEngineDependencies = { createConnection: createDuckDbConnection }) {}

  async importSource(source: RowserSource): Promise<TableMetadata> {
    const { db, connection } = await this.dependencies.createConnection();
    this.db = db;
    this.connection = connection;

    const fileName = sourceFileName(source);
    this.registeredFileName = fileName;
    await db.registerFileBuffer(fileName, new Uint8Array(await source.blob.arrayBuffer()));

    let importNotice: string | undefined;
    await connection.query(`DROP TABLE IF EXISTS ${TABLE_NAME}`);
    try {
      await connection.query(buildImportSql(fileName, source.formatHint));
    } catch (error) {
      if (!shouldRetryImportAsText(error)) {
        throw error;
      }

      await connection.query(`DROP TABLE IF EXISTS ${TABLE_NAME}`);
      await connection.query(buildImportSql(fileName, source.formatHint, true));
      importNotice = TEXT_FALLBACK_NOTICE;
    }

    const metadata = await readMetadata(connection);
    const metadataWithNotice = importNotice ? { ...metadata, importNotice } : metadata;
    this.metadata = metadataWithNotice;
    return metadataWithNotice;
  }

  async getPage(request: PageRequest): Promise<TablePage> {
    if (!this.connection || !this.metadata) {
      throw new Error('No source has been imported');
    }

    const queries = buildTableQueries(this.metadata, request);
    const countStatement = await this.connection.prepare(queries.countSql);
    const pageStatement = await this.connection.prepare(queries.pageSql);

    try {
      const [countResult, pageResult] = await Promise.all([
        countStatement.query(...queries.countParams),
        pageStatement.query(...queries.params)
      ]);
      const firstCountRow = tableRows(countResult)[0] as Record<string, unknown> | undefined;
      const filteredRowCount = Number(firstCountRow?.filtered_count ?? 0);
      const columns = visibleColumns(this.metadata);

      return {
        columns,
        rows: tableRows(pageResult),
        page: request.page,
        pageSize: request.pageSize,
        filteredRowCount
      };
    } finally {
      await Promise.all([countStatement.close(), pageStatement.close()]);
    }
  }

  async dispose(): Promise<void> {
    await this.connection?.close();
    if (this.registeredFileName) {
      await this.db?.dropFiles([this.registeredFileName]);
    }
    await this.db?.terminate();
    this.connection = null;
    this.db = null;
    this.metadata = null;
    this.registeredFileName = null;
  }
}

export function createDuckDbTableEngine(): RowserTableEngine {
  return new DuckDbTableEngine();
}

function buildImportSql(fileName: string, formatHint: SourceFormatHint, allVarchar = false): string {
  const options = [
    formatHint === 'tsv' ? "delim='\\t'" : null,
    allVarchar ? 'all_varchar=true' : null
  ].filter(Boolean);
  const optionSql = options.length > 0 ? `, ${options.join(', ')}` : '';

  return `CREATE TEMP TABLE ${TABLE_NAME} AS SELECT row_number() OVER () - 1 AS ${INTERNAL_ROW_ID_COLUMN}, * FROM read_csv_auto('${fileName}'${optionSql})`;
}

async function readMetadata(connection: DuckDbConnectionLike): Promise<TableMetadata> {
  const columnsResult = await connection.query(`PRAGMA table_info('${TABLE_NAME}')`);
  const countResult = await connection.query(`SELECT COUNT(*) AS row_count FROM ${TABLE_NAME}`);
  const rows = tableRows(columnsResult);
  const countRow = tableRows(countResult)[0] as Record<string, unknown> | undefined;

  return {
    columns: rows.map((row) => ({
      name: String(row.name),
      type: String(row.type)
    })),
    rowCount: Number(countRow?.row_count ?? 0)
  };
}

function sourceFileName(source: RowserSource): string {
  const hint = source.formatHint === 'unknown' ? formatHintFromName(source.name) : source.formatHint;
  return hint === 'tsv' ? 'rowser-source.tsv' : 'rowser-source.csv';
}

function visibleColumns(metadata: TableMetadata): string[] {
  return metadata.columns
    .map((column) => column.name)
    .filter((column) => column !== INTERNAL_ROW_ID_COLUMN);
}

function tableRows(table: ArrowTableLike): Array<Record<string, unknown>> {
  return table.toArray().map((row: unknown) => {
    if (hasToJson(row)) {
      return row.toJSON() as Record<string, unknown>;
    }

    return { ...(row as Record<string, unknown>) };
  });
}

function hasToJson(row: unknown): row is { toJSON: () => unknown } {
  return typeof row === 'object' && row !== null && 'toJSON' in row && typeof row.toJSON === 'function';
}

function shouldRetryImportAsText(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return /convert|cast|type/i.test(message);
}
