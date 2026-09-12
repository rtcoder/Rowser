import type { PageRequest, TableMetadata } from './engine-types';

const TABLE_NAME = 'rowser_data';
const INTERNAL_ROW_ID_COLUMN = '__rowser_rowid';

export interface BuiltTableQueries {
  pageSql: string;
  countSql: string;
  params: string[];
  countParams: string[];
}

export function buildTableQueries(
  metadata: TableMetadata,
  request: PageRequest
): BuiltTableQueries {
  const dataColumns = metadata.columns
    .map((column) => column.name)
    .filter((column) => column !== INTERNAL_ROW_ID_COLUMN);
  const where = buildSearchWhere(dataColumns, request.search);
  const orderBy = buildOrderBy(dataColumns, request);
  const limit = request.pageSize;
  const offset = Math.max(0, Math.floor(request.page)) * request.pageSize;
  const params = where.params;

  return {
    pageSql: [
      `SELECT ${selectColumns(dataColumns)} FROM ${TABLE_NAME}`,
      where.sql,
      orderBy,
      `LIMIT ${limit} OFFSET ${offset}`
    ]
      .filter(Boolean)
      .join(' '),
    countSql: [`SELECT COUNT(*) AS filtered_count FROM ${TABLE_NAME}`, where.sql]
      .filter(Boolean)
      .join(' '),
    params,
    countParams: [...params]
  };
}

export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function selectColumns(columns: string[]): string {
  if (columns.length === 0) {
    return INTERNAL_ROW_ID_COLUMN;
  }

  return columns.map(quoteIdentifier).join(', ');
}

function buildOrderBy(columns: string[], request: PageRequest): string {
  if (!request.sort) {
    return `ORDER BY ${INTERNAL_ROW_ID_COLUMN} ASC`;
  }

  if (!columns.includes(request.sort.column)) {
    throw new Error(`Unknown sort column: ${request.sort.column}`);
  }

  const direction = request.sort.direction === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${quoteIdentifier(request.sort.column)} ${direction} NULLS LAST, ${INTERNAL_ROW_ID_COLUMN} ASC`;
}

function buildSearchWhere(columns: string[], search: string): { sql: string; params: string[] } {
  const trimmedSearch = search.trim();
  if (!trimmedSearch || columns.length === 0) {
    return { sql: '', params: [] };
  }

  return {
    sql: `WHERE ${columns
      .map((column) => `CAST(${quoteIdentifier(column)} AS VARCHAR) ILIKE ?`)
      .join(' OR ')}`,
    params: columns.map(() => `%${trimmedSearch}%`)
  };
}
