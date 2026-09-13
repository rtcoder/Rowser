import { describe, expect, it } from 'vitest';
import { DuckDbTableEngine } from '../../extension/shared/src/viewer/engine/duckdb-engine';
import type { RowserSource } from '../../extension/shared/src/viewer/source/source-types';

function arrowTable(rows: Array<Record<string, unknown>>) {
  return {
    toArray: () => rows.map((row) => ({ toJSON: () => row }))
  };
}

describe('DuckDbTableEngine', () => {
  it('registers the source, imports it with a stable row id, and returns metadata', async () => {
    const queries: string[] = [];
    const db = {
      registerFileBuffer: async () => undefined,
      dropFiles: async () => undefined,
      terminate: async () => undefined
    };
    const connection = {
      query: async (sql: string) => {
        queries.push(sql);
        if (sql.startsWith('PRAGMA')) {
          return arrowTable([
            { name: '__rowser_rowid', type: 'BIGINT' },
            { name: 'id', type: 'BIGINT' },
            { name: 'name', type: 'VARCHAR' }
          ]);
        }

        if (sql.startsWith('SELECT COUNT')) {
          return arrowTable([{ row_count: 2 }]);
        }

        return arrowTable([]);
      },
      prepare: async () => {
        throw new Error('prepare not expected');
      },
      close: async () => undefined
    };
    const engine = new DuckDbTableEngine({
      createConnection: async () => ({ db, connection })
    });

    const metadata = await engine.importSource(source('id,name\n1,Alice\n2,Bob\n'));

    expect(metadata).toEqual({
      columns: [
        { name: '__rowser_rowid', type: 'BIGINT' },
        { name: 'id', type: 'BIGINT' },
        { name: 'name', type: 'VARCHAR' }
      ],
      rowCount: 2
    });
    expect(queries).toContain('DROP TABLE IF EXISTS rowser_data');
    expect(queries.some((sql) => sql.includes('row_number() OVER () - 1 AS __rowser_rowid'))).toBe(
      true
    );
  });

  it('retries import with text columns when automatic type inference fails', async () => {
    const queries: string[] = [];
    const db = {
      registerFileBuffer: async () => undefined,
      dropFiles: async () => undefined,
      terminate: async () => undefined
    };
    const connection = {
      query: async (sql: string) => {
        queries.push(sql);
        if (sql.includes('read_csv_auto') && !sql.includes('all_varchar=true')) {
          throw new Error('Could not convert string "text" to INT64');
        }

        if (sql.startsWith('PRAGMA')) {
          return arrowTable([
            { name: '__rowser_rowid', type: 'BIGINT' },
            { name: 'id', type: 'VARCHAR' },
            { name: 'value', type: 'VARCHAR' }
          ]);
        }

        if (sql.startsWith('SELECT COUNT')) {
          return arrowTable([{ row_count: 3 }]);
        }

        return arrowTable([]);
      },
      prepare: async () => {
        throw new Error('prepare not expected');
      },
      close: async () => undefined
    };
    const engine = new DuckDbTableEngine({
      createConnection: async () => ({ db, connection })
    });

    const metadata = await engine.importSource(source('id,value\n1,100\n2,text\n3,300\n'));

    expect(metadata).toEqual({
      columns: [
        { name: '__rowser_rowid', type: 'BIGINT' },
        { name: 'id', type: 'VARCHAR' },
        { name: 'value', type: 'VARCHAR' }
      ],
      rowCount: 3,
      importNotice: 'Some column types could not be inferred. Rowser loaded the file as text.'
    });
    expect(queries.some((sql) => sql.includes('all_varchar=true'))).toBe(true);
  });

  it('returns a table page from prepared page and count queries', async () => {
    const preparedSql: string[] = [];
    const connection = {
      query: async (sql: string) => {
        if (sql.startsWith('PRAGMA')) {
          return arrowTable([
            { name: '__rowser_rowid', type: 'BIGINT' },
            { name: 'id', type: 'BIGINT' },
            { name: 'name', type: 'VARCHAR' }
          ]);
        }

        if (sql.startsWith('SELECT COUNT')) {
          return arrowTable([{ row_count: 2 }]);
        }

        return arrowTable([]);
      },
      prepare: async (sql: string) => {
        preparedSql.push(sql);
        return {
          query: async () =>
            sql.includes('COUNT')
              ? arrowTable([{ filtered_count: 1 }])
              : arrowTable([{ id: 1, name: 'Alice' }]),
          close: async () => undefined
        };
      },
      close: async () => undefined
    };
    const engine = new DuckDbTableEngine({
      createConnection: async () => ({
        db: {
          registerFileBuffer: async () => undefined,
          dropFiles: async () => undefined,
          terminate: async () => undefined
        },
        connection
      })
    });

    await engine.importSource(source('id,name\n1,Alice\n2,Bob\n'));
    const page = await engine.getPage({
      page: 0,
      pageSize: 100,
      search: 'alice',
      sort: { column: 'name', direction: 'asc' }
    });

    expect(page).toEqual({
      columns: ['id', 'name'],
      rows: [{ id: 1, name: 'Alice' }],
      page: 0,
      pageSize: 100,
      filteredRowCount: 1
    });
    expect(preparedSql.some((sql) => sql.includes('ILIKE ?'))).toBe(true);
    expect(preparedSql.some((sql) => sql.includes('ORDER BY "name" ASC'))).toBe(true);
  });
});

function source(text: string): RowserSource {
  return {
    kind: 'local',
    name: 'simple.csv',
    size: text.length,
    formatHint: 'csv',
    blob: new Blob([text])
  };
}
