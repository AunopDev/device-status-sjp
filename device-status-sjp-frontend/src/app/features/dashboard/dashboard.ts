import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, interval, timeout } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { DeviceData, DevicesService } from '../../core/services/devices.service';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { DataTable } from '../../shared/components/data-table/data-table';

const DEVICE_TYPE_ALL = '';
const DEVICE_STATUS_ALL = '';
const DEVICE_STATUS_UNKNOWN = 'ไม่ระบุ';
const DEVICE_STATUS_ONLINE = 'online';
const DEVICE_STATUS_OFFLINE = 'offline';
const DEVICE_STATUS_OPTIONS = [
  { value: DEVICE_STATUS_ALL, label: 'ทั้งหมด' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: DEVICE_STATUS_UNKNOWN, label: 'ไม่ระบุ' },
] as const;
const DEVICE_REFRESH_INTERVAL_MS = 30_000;
const DEVICE_REQUEST_TIMEOUT_MS = 25_000;
const PROJECT_UNKNOWN = 'ไม่ระบุโครงการ';
const NODE_UNKNOWN = 'ไม่ระบุจุดติดตั้ง';
const FILTER_ALL = '';

type ProjectSummary = {
  key: string;
  name: string;
  deviceCount: number;
  nodeCount: number;
  onlineCount: number;
  offlineCount: number;
};

type NodeSummary = {
  key: string;
  name: string;
  deviceCount: number;
  onlineCount: number;
  offlineCount: number;
};

type DirectoryNode = NodeSummary & {
  projectKey: string;
  projectName: string;
};

type DashboardView = 'projects' | 'nodes' | 'devices';

function deviceStatus(device: DeviceData): string {
  const status = device['status'];
  return typeof status === 'string'
    ? status.trim().toLowerCase() || DEVICE_STATUS_UNKNOWN
    : DEVICE_STATUS_UNKNOWN;
}
const DEVICE_TYPE_UNKNOWN = 'ไม่ระบุชนิด';
function deviceType(device: DeviceData): string {
  const index = device['index'];
  return typeof index === 'string' || typeof index === 'number'
    ? String(index).trim() || DEVICE_TYPE_UNKNOWN
    : DEVICE_TYPE_UNKNOWN;
}

function recordText(device: DeviceData, field: string, fallback: string): string {
  const value = device[field];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function projectKey(device: DeviceData): string {
  return recordText(device, 'project_uuid', recordText(device, 'project_name', PROJECT_UNKNOWN));
}

function projectName(device: DeviceData): string {
  return recordText(device, 'project_name', PROJECT_UNKNOWN);
}

function nodeKey(device: DeviceData): string {
  return recordText(device, 'node_uuid', recordText(device, 'node_name', NODE_UNKNOWN));
}

function nodeName(device: DeviceData): string {
  return recordText(device, 'node_name', NODE_UNKNOWN);
}

function uniqueDeviceValues(devices: readonly DeviceData[], field: string, fallback: string): string[] {
  return [...new Set(devices.map((device) => recordText(device, field, fallback)))].sort((a, b) => a.localeCompare(b));
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DataTable, CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  readonly themeService = inject(ThemeService);
  private readonly devicesService = inject(DevicesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private deviceRequestInFlight = false;

  reloadDevices(): void {
    if (!this.devicesLoading()) this.loadDevices();
  }

  readonly currentUser = this.authService.currentUser;

  devices = signal<DeviceData[]>([]);
  devicesLoading = signal(true);
  devicesError = signal('');
  readonly allDeviceTypes = DEVICE_TYPE_ALL;
  readonly deviceTypeFilter = signal(DEVICE_TYPE_ALL);
  readonly allDeviceStatuses = DEVICE_STATUS_ALL;
  readonly deviceStatusFilter = signal(DEVICE_STATUS_ALL);
  readonly projectFilter = signal(FILTER_ALL);
  readonly regionFilter = signal(FILTER_ALL);
  readonly provinceFilter = signal(FILTER_ALL);
  readonly nodeFilter = signal(FILTER_ALL);
  readonly deviceGroupBy = signal(FILTER_ALL);
  readonly selectedProjectKey = signal<string | null>(null);
  readonly selectedNodeKey = signal<string | null>(null);
  readonly activeView = signal<DashboardView>('projects');
  readonly projects = computed<ProjectSummary[]>(() => {
    const summaries = new Map<string, ProjectSummary>();
    for (const device of this.devices()) {
      const key = projectKey(device);
      const current = summaries.get(key) ?? {
        key,
        name: projectName(device),
        deviceCount: 0,
        nodeCount: 0,
        onlineCount: 0,
        offlineCount: 0,
      };
      current.deviceCount += 1;
      if (deviceStatus(device) === DEVICE_STATUS_ONLINE) current.onlineCount += 1;
      if (deviceStatus(device) === DEVICE_STATUS_OFFLINE) current.offlineCount += 1;
      summaries.set(key, current);
    }
    for (const summary of summaries.values()) {
      summary.nodeCount = new Set(
        this.devices().filter((device) => projectKey(device) === summary.key).map(nodeKey),
      ).size;
    }
    return [...summaries.values()].sort((first, second) => first.name.localeCompare(second.name));
  });
  readonly selectedProject = computed(() =>
    this.projects().find((project) => project.key === this.selectedProjectKey()),
  );
  readonly nodesInSelectedProject = computed<NodeSummary[]>(() => {
    const selectedProjectKey = this.selectedProjectKey();
    if (!selectedProjectKey) return [];
    const summaries = new Map<string, NodeSummary>();
    for (const device of this.devices()) {
      if (projectKey(device) !== selectedProjectKey) continue;
      const key = nodeKey(device);
      const current = summaries.get(key) ?? {
        key,
        name: nodeName(device),
        deviceCount: 0,
        onlineCount: 0,
        offlineCount: 0,
      };
      current.deviceCount += 1;
      if (deviceStatus(device) === DEVICE_STATUS_ONLINE) current.onlineCount += 1;
      if (deviceStatus(device) === DEVICE_STATUS_OFFLINE) current.offlineCount += 1;
      summaries.set(key, current);
    }
    return [...summaries.values()].sort((first, second) => first.name.localeCompare(second.name));
  });
  readonly selectedNode = computed(() =>
    this.nodesInSelectedProject().find((node) => node.key === this.selectedNodeKey()),
  );
  readonly allNodes = computed<DirectoryNode[]>(() => {
    const summaries = new Map<string, DirectoryNode>();
    for (const device of this.devices()) {
      const currentProjectKey = projectKey(device);
      const currentNodeKey = nodeKey(device);
      const key = `${currentProjectKey}:${currentNodeKey}`;
      const current = summaries.get(key) ?? {
        key: currentNodeKey,
        name: nodeName(device),
        deviceCount: 0,
        onlineCount: 0,
        offlineCount: 0,
        projectKey: currentProjectKey,
        projectName: projectName(device),
      };
      current.deviceCount += 1;
      if (deviceStatus(device) === DEVICE_STATUS_ONLINE) current.onlineCount += 1;
      if (deviceStatus(device) === DEVICE_STATUS_OFFLINE) current.offlineCount += 1;
      summaries.set(key, current);
    }
    return [...summaries.values()].sort((first, second) =>
      `${first.projectName}${first.name}`.localeCompare(`${second.projectName}${second.name}`),
    );
  });
  readonly devicesOfSelectedType = computed(() =>
    this.devices().filter(
      (device) =>
        this.deviceTypeFilter() === DEVICE_TYPE_ALL ||
        deviceType(device) === this.deviceTypeFilter(),
    ),
  );
  readonly deviceStatusOptions = computed(() => {
    const devices = this.devicesOfSelectedType();
    return DEVICE_STATUS_OPTIONS.map((option) => ({
      ...option,
      count:
        option.value === DEVICE_STATUS_ALL
          ? devices.length
          : devices.filter((device) => deviceStatus(device) === option.value).length,
    }));
  });
  readonly hasDeviceFilters = computed(
    () =>
      this.deviceTypeFilter() !== DEVICE_TYPE_ALL ||
      this.deviceStatusFilter() !== DEVICE_STATUS_ALL ||
      this.projectFilter() !== FILTER_ALL || this.regionFilter() !== FILTER_ALL ||
      this.provinceFilter() !== FILTER_ALL || this.nodeFilter() !== FILTER_ALL,
  );

  clearDeviceFilters(): void {
    this.deviceTypeFilter.set(DEVICE_TYPE_ALL);
    this.deviceStatusFilter.set(DEVICE_STATUS_ALL);
    this.projectFilter.set(FILTER_ALL);
    this.regionFilter.set(FILTER_ALL);
    this.provinceFilter.set(FILTER_ALL);
    this.nodeFilter.set(FILTER_ALL);
  }
  readonly deviceTypes = computed(() =>
    [...new Set(this.devices().map(deviceType))].sort((first, second) =>
      first.localeCompare(second, undefined, { numeric: true }),
    ),
  );
  readonly filteredDevices = computed(() =>
    this.devices().filter(
      (device) =>
        (this.selectedProjectKey() === null || projectKey(device) === this.selectedProjectKey()) &&
        (this.selectedNodeKey() === null || nodeKey(device) === this.selectedNodeKey()) &&
        (this.deviceTypeFilter() === DEVICE_TYPE_ALL ||
          deviceType(device) === this.deviceTypeFilter()) &&
        (this.deviceStatusFilter() === DEVICE_STATUS_ALL ||
          deviceStatus(device) === this.deviceStatusFilter()),
    ),
  );
  readonly allFilteredDevices = computed(() =>
    this.devices().filter(
      (device) =>
        (this.deviceTypeFilter() === DEVICE_TYPE_ALL ||
          deviceType(device) === this.deviceTypeFilter()) &&
        (this.deviceStatusFilter() === DEVICE_STATUS_ALL ||
          deviceStatus(device) === this.deviceStatusFilter()) &&
        (this.projectFilter() === FILTER_ALL || recordText(device, 'project_name', PROJECT_UNKNOWN) === this.projectFilter()) &&
        (this.regionFilter() === FILTER_ALL || recordText(device, 'project_region', 'ไม่ระบุภูมิภาค') === this.regionFilter()) &&
        (this.provinceFilter() === FILTER_ALL || recordText(device, 'project_province', 'ไม่ระบุจังหวัด') === this.provinceFilter()) &&
        (this.nodeFilter() === FILTER_ALL || nodeName(device) === this.nodeFilter()),
    ),
  );
  readonly projectOptions = computed(() => uniqueDeviceValues(this.devices(), 'project_name', PROJECT_UNKNOWN));
  readonly regionOptions = computed(() => uniqueDeviceValues(this.devices(), 'project_region', 'ไม่ระบุภูมิภาค'));
  readonly provinceOptions = computed(() => uniqueDeviceValues(this.devices(), 'project_province', 'ไม่ระบุจังหวัด'));
  readonly nodeOptions = computed(() => uniqueDeviceValues(this.devices(), 'node_name', NODE_UNKNOWN));

  setActiveView(view: DashboardView): void {
    this.activeView.set(view);
    this.clearDeviceFilters();
  }

  selectProject(project: ProjectSummary): void {
    this.selectedProjectKey.set(project.key);
    this.selectedNodeKey.set(null);
    this.clearDeviceFilters();
  }

  selectNode(node: NodeSummary): void {
    this.selectedNodeKey.set(node.key);
    this.clearDeviceFilters();
  }

  selectDirectoryNode(node: DirectoryNode): void {
    this.selectedProjectKey.set(node.projectKey);
    this.selectedNodeKey.set(node.key);
    this.activeView.set('projects');
    this.clearDeviceFilters();
  }

  backToProjects(): void {
    this.selectedProjectKey.set(null);
    this.selectedNodeKey.set(null);
    this.clearDeviceFilters();
  }

  backToNodes(): void {
    this.selectedNodeKey.set(null);
    this.clearDeviceFilters();
  }
  ngOnInit(): void {
    this.loadDevices();
    interval(DEVICE_REFRESH_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadDevices(true));
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  openSidebarDemo(): void {
    void this.router.navigateByUrl('/sidebar-demo');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  loadDevices(background = false): void {
    if (this.deviceRequestInFlight) return;
    this.deviceRequestInFlight = true;
    this.devicesError.set('');
    if (!background) this.devicesLoading.set(true);
    this.devicesService
      .getAll()
      .pipe(
        timeout(DEVICE_REQUEST_TIMEOUT_MS),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.deviceRequestInFlight = false;
          this.devicesLoading.set(false);
        }),
      )
      .subscribe({
        next: (data) => {
          this.devices.set(data);
          this.devicesLoading.set(false);
        },
        error: () => {
          this.devicesError.set('ไม่สามารถโหลดข้อมูล Device ได้');
          this.devicesLoading.set(false);
        },
      });
  }
}
