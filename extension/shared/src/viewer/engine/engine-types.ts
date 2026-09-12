import type { RowserSource } from '../source/source-types';

export interface SortSpec {
  column: string;
  direction: 'asc' | 'desc';
}

export interface PageRequest {
  page: number;
  pageSize: 50 | 100 | 250 | 500;
  search: string;
  sort: SortSpec | null;
}

export interface TableMetadata {
  columns: Array<{
    name: string;
    type: string;
  }>;
  rowCount: number;
}

export interface TablePage {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  page: number;
  pageSize: number;
  filteredRowCount: number;
}

export interface RowserTableEngine {
  importSource(source: RowserSource): Promise<TableMetadata>;
  getPage(request: PageRequest): Promise<TablePage>;
  dispose(): Promise<void>;
}
