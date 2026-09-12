import { describe, expect, it } from 'vitest';
import {
  buildTableQueries,
  quoteIdentifier
} from '../../extension/shared/src/viewer/engine/query-builder';
import type { PageRequest, TableMetadata } from '../../extension/shared/src/viewer/engine/engine-types';

const metadata: TableMetadata = {
  columns: [
    { name: 'id', type: 'BIGINT' },
    { name: 'name', type: 'VARCHAR' },
    { name: 'email"address', type: 'VARCHAR' },
    { name: '__rowser_rowid', type: 'BIGINT' }
  ],
  rowCount: 3
};

function request(overrides: Partial<PageRequest> = {}): PageRequest {
  return {
    page: 0,
    pageSize: 100,
    search: '',
    sort: null,
    ...overrides
  };
}

describe('quoteIdentifier', () => {
  it('escapes embedded quotes', () => {
    expect(quoteIdentifier('email"address')).toBe('"email""address"');
  });
});

describe('buildTableQueries', () => {
  it('uses stable source order without an explicit sort', () => {
    expect(buildTableQueries(metadata, request()).pageSql).toContain(
      'ORDER BY __rowser_rowid ASC'
    );
  });

  it('sorts by a validated column with row id as tie breaker', () => {
    expect(
      buildTableQueries(
        metadata,
        request({ sort: { column: 'name', direction: 'desc' } })
      ).pageSql
    ).toContain('ORDER BY "name" DESC NULLS LAST, __rowser_rowid ASC');
  });

  it('rejects sort columns that are not in metadata', () => {
    expect(() =>
      buildTableQueries(
        metadata,
        request({ sort: { column: 'name; DROP TABLE rowser_data;', direction: 'asc' } })
      )
    ).toThrow('Unknown sort column');
  });

  it('builds page and count queries from the same bound search filter', () => {
    const queries = buildTableQueries(metadata, request({ search: "alice%' OR 1=1 --" }));

    expect(queries.pageSql).toContain('WHERE CAST("id" AS VARCHAR) ILIKE ?');
    expect(queries.pageSql).toContain('OR CAST("email""address" AS VARCHAR) ILIKE ?');
    expect(queries.pageSql).not.toContain('__rowser_rowid" AS VARCHAR');
    expect(queries.countSql).toContain('WHERE CAST("id" AS VARCHAR) ILIKE ?');
    expect(queries.params).toEqual([
      "%alice%' OR 1=1 --%",
      "%alice%' OR 1=1 --%",
      "%alice%' OR 1=1 --%"
    ]);
    expect(queries.countParams).toEqual(queries.params);
  });

  it('uses SQL-backed pagination offsets', () => {
    const queries = buildTableQueries(metadata, request({ page: 2, pageSize: 50 }));

    expect(queries.pageSql).toContain('LIMIT 50 OFFSET 100');
  });
});
