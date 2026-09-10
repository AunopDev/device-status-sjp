import { ChangeDetectionStrategy, Component, DestroyRef, ErrorHandler, OnInit, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { DeviceData, DevicesService } from '../../core/services/devices.service';
import { columnGroupingFeature, createGroupedRowModel, createExpandedRowModel, rowExpandingFeature, tableFeatures, injectTable, ExpandedState } from '@tanstack/angular-table';

const DEVICE_REQUEST_TIMEOUT_MS = 25_000;
const ALL_VALUES = '';
const GROUP_FIELDS = ['status', 'index', 'project_region', 'project_province', 'project_name'] as const;
type GroupField = typeof GROUP_FIELDS[number];
type FilterName = 'project' | 'region' | 'province' | 'device' | 'status';
const OPTION_DEPENDENCIES: Record<GroupField, readonly GroupField[]> = {
  project_region: ['index', 'status'],
  project_province: ['project_region', 'index', 'status'],
  project_name: ['project_region', 'project_province', 'index', 'status'],
  index: ['project_region', 'project_province', 'project_name', 'status'],
  status: ['project_region', 'project_province', 'project_name', 'index'],
};
const features = tableFeatures({
  columnGroupingFeature, rowExpandingFeature,
  groupedRowModel: createGroupedRowModel(), expandedRowModel: createExpandedRowModel(),
});

@Component({
  selector: 'app-row-group-demo',
  imports: [RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './row-group-demo.html',
  styleUrl: './row-group-demo.css',
})
export class RowGroupDemo implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly errorHandler = inject(ErrorHandler);
  readonly devices = signal<DeviceData[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly embedded = input(false);
  readonly inputDevices = input<DeviceData[] | null>(null);
  readonly inputLoading = input<boolean | null>(null);
  readonly inputError = input<string | null>(null);
  readonly sourceDevices = computed(() => this.inputDevices() ?? this.devices());
  readonly sourceLoading = computed(() => this.inputLoading() ?? this.isLoading());
  readonly sourceError = computed(() => this.inputError() ?? this.errorMessage());
  readonly projectFilter = signal(ALL_VALUES);
  readonly regionFilter = signal(ALL_VALUES);
  readonly provinceFilter = signal(ALL_VALUES);
  readonly deviceTypeFilter = signal(ALL_VALUES);
  readonly statusFilter = signal(ALL_VALUES);
  readonly expanded = signal<ExpandedState>({});
  readonly projectOptions = computed(() => this.filterOptions('project_name'));
  readonly regionOptions = computed(() => this.filterOptions('project_region'));
  readonly provinceOptions = computed(() => this.filterOptions('project_province'));
  readonly deviceOptions = computed(() => this.filterOptions('index'));
  readonly statusOptions = computed(() => this.filterOptions('status'));
  private readonly filteredDevices = computed(() => this.sourceDevices().filter(device =>
    this.matchesFilter(device, 'project_name', this.projectFilter())
    && this.matchesFilter(device, 'project_region', this.regionFilter())
    && this.matchesFilter(device, 'project_province', this.provinceFilter())
    && this.matchesFilter(device, 'index', this.deviceTypeFilter())
    && this.matchesFilter(device, 'status', this.statusFilter()),
  ));
  private readonly columns = GROUP_FIELDS.map(field => ({
    id: field,
    accessorFn: (device: DeviceData) => this.displayValue(device[field]),
  }));
  readonly filteredDeviceCount = computed(() => this.filteredDevices().length);
  readonly hasActiveFilters = computed(() =>
    [this.projectFilter(), this.regionFilter(), this.provinceFilter(), this.deviceTypeFilter(), this.statusFilter()]
      .some(Boolean),
  );
  readonly table = injectTable(() => ({
    features,
    data: this.filteredDevices(),
    columns: this.columns,
    // Changing the group resets expansion explicitly; refreshing preserves it.
    autoResetExpanded: false,
    state: {
      grouping: [...GROUP_FIELDS],
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

  setFilter(value: string, filter: FilterName): void {
    const filters = {
      project: this.projectFilter,
      region: this.regionFilter,
      province: this.provinceFilter,
      device: this.deviceTypeFilter,
      status: this.statusFilter,
    };
    filters[filter].set(value);
    if (filter === 'region') {
      this.provinceFilter.set(ALL_VALUES);
      this.projectFilter.set(ALL_VALUES);
    } else if (filter === 'province') {
      this.projectFilter.set(ALL_VALUES);
    }
    this.expanded.set(true);
  }

  clearFilters(): void {
    this.projectFilter.set(ALL_VALUES);
    this.regionFilter.set(ALL_VALUES);
    this.provinceFilter.set(ALL_VALUES);
    this.deviceTypeFilter.set(ALL_VALUES);
    this.statusFilter.set(ALL_VALUES);
    this.expanded.set({});
  }

  private filterOptions(field: GroupField): string[] {
    const selected: Record<GroupField, string> = {
      project_region: this.regionFilter(),
      project_province: this.provinceFilter(),
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
