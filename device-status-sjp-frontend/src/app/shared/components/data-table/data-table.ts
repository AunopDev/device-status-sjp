import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import {
  RowData,
  ColumnDef,
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  FlexRender,
  globalFilteringFeature,
  injectTable,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
} from '@tanstack/angular-table';

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric },
});

export type DataTableColumn<T extends RowData> = ColumnDef<typeof features, T, any>;

/**
 * Generic, reusable data table built on TanStack Table + daisyUI.
 *
 * - Pass `columns` explicitly for a known shape (e.g. NodeData), or
 * - Omit `columns` and the component auto-detects columns from the keys
 *   found across the loaded rows (useful for dynamic Google Sheet data
 *   such as devices/decoders whose column set isn't fixed).
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [FlexRender, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.html',
  styleUrl: './data-table.css',
})
export class DataTable<T extends RowData> {
  data = input.required<T[]>();
  columns = input<DataTableColumn<T>[] | null>(null);
  isLoading = input(false);
  errorMessage = input('');
  emptyMessage = input('ไม่มีข้อมูล');
  pageSize = input(10);
  pageSizeOptions = input([10, 20, 30]);

  globalFilter = signal('');
  sorting = signal<{ id: string; desc: boolean }[]>([]);
  pagination = signal({ pageIndex: 0, pageSize: this.pageSize() });

  readonly skeletonRows = [0, 1, 2, 3, 4];

  private lastAutoKeySignature = '';
  private lastAutoColumns: DataTableColumn<T>[] = [];

  private readonly resolvedColumns = computed<DataTableColumn<T>[]>(() => {
    const explicit = this.columns();
    if (explicit && explicit.length > 0) return explicit;

    const rows = this.data();
    const keys = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row as Record<string, unknown>)) {
        keys.add(key);
      }
    }
    const signature = [...keys].sort().join('|');

    if (signature !== this.lastAutoKeySignature) {
      this.lastAutoKeySignature = signature;
      this.lastAutoColumns = buildAutoColumns<T>(keys);
    }

    return this.lastAutoColumns;
  });

  readonly table = injectTable<typeof features, T>(() => ({
    features,
    data: this.data(),
    columns: this.resolvedColumns(),
    state: {
      globalFilter: this.globalFilter(),
      sorting: this.sorting(),
      pagination: this.pagination(),
    },
    globalFilterFn: 'includesString',
    onGlobalFilterChange: (updater) => {
      this.globalFilter.set(
        typeof updater === 'function' ? updater(this.globalFilter()) : updater,
      );
    },
    onSortingChange: (updater) => {
      this.sorting.set(
        typeof updater === 'function' ? updater(this.sorting()) : updater,
      );
    },
    onPaginationChange: (updater) => {
      this.pagination.set(
        typeof updater === 'function' ? updater(this.pagination()) : updater,
      );
    },
  }));

  onSearchInput(value: string): void {
    this.globalFilter.set(value);
    this.pagination.set({ ...this.pagination(), pageIndex: 0 });
  }

  onPageSizeChange(value: string): void {
    const size = Number(value) || this.pageSizeOptions()[0];
    this.pagination.set({ pageIndex: 0, pageSize: size });
  }

  pageNumbers(): number[] {
    const pageCount = this.table.getPageCount();
    const currentPage = this.pagination().pageIndex + 1;
    const firstPage = Math.max(1, currentPage - 3);
    const lastPage = Math.min(pageCount, currentPage + 3);

    return Array.from(
      { length: Math.max(0, lastPage - firstPage + 1) },
      (_, index) => firstPage + index,
    );
  }

  goToPage(pageNumber: number): void {
    const pageIndex = pageNumber - 1;
    if (pageIndex >= 0 && pageIndex < this.table.getPageCount()) {
      this.table.setPageIndex(pageIndex);
    }
  }

  goToPageFromInput(value: string): void {
    const pageNumber = Number.parseInt(value, 10);
    if (Number.isInteger(pageNumber)) this.goToPage(pageNumber);
  }

  /**
   * Maps a status-ish text value to a soft daisyUI badge color, mirroring
   * the pill style of a typical status column (online/completed -> success,
   * offline/error -> error, in progress -> warning, everything else -> info).
   */
  badgeClass(value: unknown): string {
    const text = String(value ?? '').toLowerCase();
    if (/(online|completed|success|active|เสร็จ|ออนไลน์)/.test(text)) {
      return 'badge-success bg-success/15 text-success';
    }
    if (/(offline|error|failed|inactive|ออฟไลน์|ผิดพลาด)/.test(text)) {
      return 'badge-error bg-error/15 text-error';
    }
    if (/(progress|pending|warning|กำลัง|รอ)/.test(text)) {
      return 'badge-warning bg-warning/15 text-warning';
    }
    return 'badge-info bg-info/15 text-info';
  }
}

/**
 * Builds a best-effort column list from a set of keys. Keeps a stable,
 * readable order: identity-ish fields first, then the rest alphabetically.
 */
function buildAutoColumns<T extends RowData>(
  keys: Set<string>,
): DataTableColumn<T>[] {
  const priority = ['uuid', 'name', 'ref', 'status'];
  const ordered = [
    ...priority.filter((k) => keys.has(k)),
    ...[...keys].filter((k) => !priority.includes(k)).sort(),
  ];

  return ordered.map((key) => ({
    id: key,
    accessorFn: (row: T) => (row as Record<string, unknown>)[key],
    header: humanizeHeader(key),
    cell: (info) => formatCellValue(info.getValue()),
  }));
}

function humanizeHeader(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
