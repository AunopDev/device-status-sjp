import { ChangeDetectionStrategy, Component, DestroyRef, ErrorHandler, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { DeviceData, DevicesService } from '../../core/services/devices.service';
import { columnGroupingFeature, createGroupedRowModel, createExpandedRowModel, rowExpandingFeature, tableFeatures, injectTable, ExpandedState } from '@tanstack/angular-table';

const DEVICE_REQUEST_TIMEOUT_MS = 25_000;
const ALL_VALUES = '';
const STATUS_ONLINE = 'online';
const STATUS_OFFLINE = 'offline';
const SEARCH_FIELDS = ['name', 'node_name', 'project_name', 'index', 'status', 'decoder_name'] as const;
const GROUP_FIELDS = ['status', 'index', 'project_name'] as const;
type GroupField = typeof GROUP_FIELDS[number];
const GROUP_OPTIONS: readonly { value: GroupField; label: string }[] = [
  { value: 'status', label: 'สถานะ' },
  { value: 'index', label: 'ชนิดอุปกรณ์' },
  { value: 'project_name', label: 'โครงการ' },
];
type FilterName = 'project' | 'device' | 'status';
const OPTION_DEPENDENCIES: Record<GroupField, readonly GroupField[]> = {
  project_name: ['index', 'status'],
  index: ['project_name', 'status'],
  status: ['project_name', 'index'],
};
const features = tableFeatures({
  columnGroupingFeature, rowExpandingFeature,
  groupedRowModel: createGroupedRowModel(), expandedRowModel: createExpandedRowModel(),
});

@Component({
  selector: 'app-row-group',
  imports: [DecimalPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './row-group.html',
  styleUrl: './row-group.css',
})
export class RowGroupDemo implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly errorHandler = inject(ErrorHandler);
  readonly devices = signal<DeviceData[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly embedded = input(false);
  readonly refreshRequested = output<void>();
  readonly inputDevices = input<DeviceData[] | null>(null);
  readonly inputLoading = input<boolean | null>(null);
  readonly inputError = input<string | null>(null);
  readonly sourceDevices = computed(() => this.inputDevices() ?? this.devices());
  readonly sourceLoading = computed(() => this.inputLoading() ?? this.isLoading());
  readonly sourceError = computed(() => this.inputError() ?? this.errorMessage());
  readonly projectFilter = signal(ALL_VALUES);
  readonly deviceTypeFilter = signal(ALL_VALUES);
  readonly statusFilter = signal(ALL_VALUES);
  readonly searchTerm = signal(ALL_VALUES);
  readonly activeGrouping = signal<readonly GroupField[]>([]);
  readonly expanded = signal<ExpandedState>({});
  readonly groupOptions = GROUP_OPTIONS;
  readonly projectOptions = computed(() => this.filterOptions('project_name'));
  readonly deviceOptions = computed(() => this.filterOptions('index'));
  readonly statusOptions = computed(() => this.filterOptions('status'));
  private readonly filteredDevices = computed(() => this.sourceDevices().filter(device =>
    this.matchesSearch(device, this.searchTerm())
    && this.matchesFilter(device, 'project_name', this.projectFilter())
    && this.matchesFilter(device, 'index', this.deviceTypeFilter())
    && this.matchesFilter(device, 'status', this.statusFilter()),
  ));
  private readonly columns = GROUP_FIELDS.map(field => ({
    id: field,
    accessorFn: (device: DeviceData) => this.displayValue(device[field]),
  }));
  readonly filteredDeviceCount = computed(() => this.filteredDevices().length);
  readonly statusSummary = computed(() => {
    const devices = this.filteredDevices();
    const online = devices.filter((device) => this.displayValue(device['status']).toLowerCase() === STATUS_ONLINE).length;
    const offline = devices.filter((device) => this.displayValue(device['status']).toLowerCase() === STATUS_OFFLINE).length;
    return {
      total: devices.length,
      online,
      offline,
      unknown: devices.length - online - offline,
    };
  });
  readonly hasActiveFilters = computed(() =>
    [this.searchTerm(), this.projectFilter(), this.deviceTypeFilter(), this.statusFilter()]
      .some(Boolean),
  );
  readonly table = injectTable(() => ({
    features,
    data: this.filteredDevices(),
    columns: this.columns,
    // Changing the group resets expansion explicitly; refreshing preserves it.
    autoResetExpanded: false,
    state: {
      grouping: [...this.activeGrouping()],
      expanded: this.expanded(),
    },
    onExpandedChange: updater => {
      this.expanded.update(previous => typeof updater === 'function' ? updater(previous) : updater);
    },
  }));

  displayValue(value: unknown): string {
    return typeof value === 'string' && value.trim() ? value.trim()
      : typeof value === 'number' ? String(value) : 'ไม่ระบุ';
  }

  toggleGrouping(field: GroupField): void {
    this.activeGrouping.update(selected =>
      GROUP_FIELDS.filter(candidate => candidate === field
        ? !selected.includes(candidate)
        : selected.includes(candidate)),
    );
    this.expanded.set({});
  }

  clearGrouping(): void {
    this.activeGrouping.set([]);
    this.expanded.set({});
  }

  setFilter(value: string, filter: FilterName): void {
    const filters = {
      project: this.projectFilter,
      device: this.deviceTypeFilter,
      status: this.statusFilter,
    };
    filters[filter].set(value);
    this.expanded.set(true);
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.expanded.set(true);
  }

  refresh(): void {
    if (this.sourceLoading()) return;
    if (this.embedded()) this.refreshRequested.emit();
    else this.loadDevices();
  }

  clearFilters(): void {
    this.searchTerm.set(ALL_VALUES);
    this.projectFilter.set(ALL_VALUES);
    this.deviceTypeFilter.set(ALL_VALUES);
    this.statusFilter.set(ALL_VALUES);
    this.expanded.set({});
  }

  private filterOptions(field: GroupField): string[] {
    const selected: Record<GroupField, string> = {
      project_name: this.projectFilter(),
      index: this.deviceTypeFilter(),
      status: this.statusFilter(),
    };
    return [...new Set(this.sourceDevices()
      .filter(device => OPTION_DEPENDENCIES[field].every(dependency =>
        this.matchesFilter(device, dependency, selected[dependency]),
      ))
      .map(device => this.displayValue(device[field])))]
      .sort((a, b) => a.localeCompare(b));
  }

  private matchesFilter(device: DeviceData, field: typeof GROUP_FIELDS[number], selectedValue: string): boolean {
    return selectedValue === ALL_VALUES || this.displayValue(device[field]) === selectedValue;
  }

  private matchesSearch(device: DeviceData, searchTerm: string): boolean {
    const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase();
    return normalizedSearchTerm === ALL_VALUES || SEARCH_FIELDS.some(field =>
      this.displayValue(device[field]).toLocaleLowerCase().includes(normalizedSearchTerm),
    );
  }

  ngOnInit(): void {
    if (this.inputDevices() === null) this.loadDevices();
  }

  loadDevices(): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.devicesService.getAll().pipe(
      timeout(DEVICE_REQUEST_TIMEOUT_MS),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isLoading.set(false)),
    ).subscribe({
      next: devices => this.devices.set(devices),
      error: (error: unknown) => {
        this.errorMessage.set('โหลดข้อมูลอุปกรณ์ไม่สำเร็จ กรุณาลองโหลดข้อมูลใหม่');
        this.errorHandler.handleError(error);
      },
    });
  }
}
