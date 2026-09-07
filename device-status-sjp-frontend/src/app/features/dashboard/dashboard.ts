import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NodeData, NodesService } from '../../core/services/nodes.service';
import { DeviceData, DevicesService } from '../../core/services/devices.service';
import { ProjectData, ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import {
  DataTableColumn,
  DataTable,
} from '../../shared/components/data-table/data-table';

type TabId = 'node' | 'device' | 'project';

const NODE_STATUS_UNKNOWN = 'ไม่ระบุ';
const PROJECT_STATE_ALL = 'all';
const DEVICE_TYPE_ALL = '';
const DEVICE_STATUS_ALL = '';
const DEVICE_STATUS_UNKNOWN = 'ไม่ระบุ';

function deviceStatus(device: DeviceData): string {
  const status = device['status'];
  return typeof status === 'string' ? status.trim().toLowerCase() || DEVICE_STATUS_UNKNOWN : DEVICE_STATUS_UNKNOWN;
}
const DEVICE_TYPE_UNKNOWN = 'ไม่ระบุชนิด';
const NODE_TYPE_ALL = '';
const NODE_TYPE_UNKNOWN = 'ไม่ระบุชนิด';
const PROJECT_AREA_ALL = '';
const PROJECT_FIELD_UNKNOWN = 'ไม่ระบุ';

function projectField(project: ProjectData, field: 'state' | 'region' | 'province'): string {
  const value = project[field];
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim() || PROJECT_FIELD_UNKNOWN
    : PROJECT_FIELD_UNKNOWN;
}

function nodeType(node: NodeData): string {
  const index = node['index'];
  return (typeof index === 'string' || typeof index === 'number')
    ? String(index).trim() || NODE_TYPE_UNKNOWN
    : NODE_TYPE_UNKNOWN;
}

function deviceType(device: DeviceData): string {
  const index = device['index'];
  return (typeof index === 'string' || typeof index === 'number')
    ? String(index).trim() || DEVICE_TYPE_UNKNOWN
    : DEVICE_TYPE_UNKNOWN;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DataTable, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly nodesService = inject(NodesService);
  readonly themeService = inject(ThemeService);
  private readonly devicesService = inject(DevicesService);
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly tabs: readonly { id: TabId; label: string }[] = [
    { id: 'device', label: 'Device' },
    { id: 'project', label: 'Project' },
    { id: 'node', label: 'Node' },
  ];
  readonly allProjectStates = PROJECT_STATE_ALL;
  readonly activeTabLabel = computed(() => this.tabs.find(tab => tab.id === this.activeTab())?.label ?? '');
  readonly activeLoading = computed(() => this.activeTab() === 'project' ? this.projectsLoading() : this.activeTab() === 'node' ? this.nodesLoading() : this.devicesLoading());

  reloadActiveTab(): void {
    if (this.activeLoading()) return;
    switch (this.activeTab()) {
      case 'project': this.loadProjects(); break;
      case 'node': this.loadNodes(); break;
      case 'device': this.loadDevices(); break;
    }
  }

  readonly currentUser = this.authService.currentUser;

  activeTab = signal<TabId>('device');

  nodes = signal<NodeData[]>([]);
  devices = signal<DeviceData[]>([]);
  projects = signal<ProjectData[]>([]);

  nodesLoading = signal(true);
  devicesLoading = signal(true);
  projectsLoading = signal(true);

  nodesError = signal('');
  devicesError = signal('');
  projectsError = signal('');

  readonly nodeColumns: DataTableColumn<NodeData>[] = [
    { id: 'uuid', accessorKey: 'uuid', header: 'UUID' },
    { id: 'name', accessorKey: 'name', header: 'ชื่อ Node' },
    { id: 'index', accessorFn: nodeType, header: 'ชนิด Node' },
    { id: 'ref', accessorKey: 'ref', header: 'Reference' },
    { id: 'province', accessorKey: 'province', header: 'จังหวัด' },
    { id: 'jnumber', accessorKey: 'jnumber', header: 'J-Number' },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'สถานะ',
      cell: (info) => String(info.getValue() ?? '').trim() || NODE_STATUS_UNKNOWN,
      meta: { badge: true },
    },
  ];

  readonly projectColumns: DataTableColumn<ProjectData>[] = [
    { id: 'name', accessorKey: 'name', header: 'ชื่อ Project' },
    {
      id: 'state',
      accessorKey: 'state',
      header: 'สถานะ Project',
      cell: (info) => String(info.getValue() ?? 'ไม่ระบุ'),
      meta: { badge: true },
    },
    { id: 'region', accessorKey: 'region', header: 'Region' },
    { id: 'province', accessorKey: 'province', header: 'จังหวัด' },
    { id: 'uuid', accessorKey: 'uuid', header: 'UUID' },
  ];

  readonly nodeStateFilter = signal(PROJECT_STATE_ALL);
  readonly allNodeTypes = NODE_TYPE_ALL;
  readonly nodeTypeFilter = signal(NODE_TYPE_ALL);
  readonly nodeTypes = computed(() =>
    [...new Set(this.nodes().map(nodeType))].sort((first, second) =>
      first.localeCompare(second, undefined, { numeric: true }),
    ),
  );
  readonly allDeviceTypes = DEVICE_TYPE_ALL;
  readonly deviceTypeFilter = signal(DEVICE_TYPE_ALL);
  readonly allDeviceStatuses = DEVICE_STATUS_ALL;
  readonly deviceStatusFilter = signal(DEVICE_STATUS_ALL);
  readonly deviceStatuses = computed(() => [...new Set(this.devices().map(deviceStatus))].sort());
  readonly hasDeviceFilters = computed(() =>
    this.deviceTypeFilter() !== DEVICE_TYPE_ALL || this.deviceStatusFilter() !== DEVICE_STATUS_ALL,
  );

  clearDeviceFilters(): void {
    this.deviceTypeFilter.set(DEVICE_TYPE_ALL);
    this.deviceStatusFilter.set(DEVICE_STATUS_ALL);
  }
  readonly deviceTypes = computed(() =>
    [...new Set(this.devices().map(deviceType))].sort((first, second) =>
      first.localeCompare(second, undefined, { numeric: true }),
    ),
  );
  readonly filteredDevices = computed(() =>
    this.devices().filter(device =>
      (this.deviceTypeFilter() === DEVICE_TYPE_ALL || deviceType(device) === this.deviceTypeFilter()) &&
      (this.deviceStatusFilter() === DEVICE_STATUS_ALL || deviceStatus(device) === this.deviceStatusFilter()),
    ),
  );
  readonly nodeStates = computed(() => [...new Set(this.nodes().map(node => node.status?.trim().toLowerCase() || NODE_STATUS_UNKNOWN))].sort());
  readonly filteredNodes = computed(() => this.nodes().filter(node =>
    (this.nodeStateFilter() === PROJECT_STATE_ALL || (node.status?.trim().toLowerCase() || NODE_STATUS_UNKNOWN) === this.nodeStateFilter()) &&
    (this.nodeTypeFilter() === NODE_TYPE_ALL || nodeType(node) === this.nodeTypeFilter()),
  ));
  readonly projectStateFilter = signal(PROJECT_STATE_ALL);
  readonly allProjectAreas = PROJECT_AREA_ALL;
  readonly projectRegionFilter = signal(PROJECT_AREA_ALL);
  readonly projectProvinceFilter = signal(PROJECT_AREA_ALL);
  readonly projectRegions = computed(() => [...new Set(this.projects().map(project => projectField(project, 'region')))].sort());
  readonly projectProvinces = computed(() => [...new Set(this.projects()
    .filter(project => this.projectRegionFilter() === PROJECT_AREA_ALL || projectField(project, 'region') === this.projectRegionFilter())
    .map(project => projectField(project, 'province')))].sort());
  readonly hasProjectFilters = computed(() => this.projectStateFilter() !== PROJECT_STATE_ALL ||
    this.projectRegionFilter() !== PROJECT_AREA_ALL || this.projectProvinceFilter() !== PROJECT_AREA_ALL);

  setProjectRegion(region: string): void {
    this.projectRegionFilter.set(region);
    this.projectProvinceFilter.set(PROJECT_AREA_ALL);
  }

  clearProjectFilters(): void {
    this.projectStateFilter.set(PROJECT_STATE_ALL);
    this.setProjectRegion(PROJECT_AREA_ALL);
  }
  readonly projectStates = computed(() => {
    const states = this.projects().map((project) => projectField(project, 'state'));
    return [...new Set(states)].sort((first, second) => first.localeCompare(second));
  });
  readonly filteredProjects = computed(() => {
    const selectedState = this.projectStateFilter();
    return this.projects().filter(
      (project) => (selectedState === PROJECT_STATE_ALL || projectField(project, 'state') === selectedState) &&
        (this.projectRegionFilter() === PROJECT_AREA_ALL || projectField(project, 'region') === this.projectRegionFilter()) &&
        (this.projectProvinceFilter() === PROJECT_AREA_ALL || projectField(project, 'province') === this.projectProvinceFilter()),
    );
  });

  ngOnInit(): void {
    this.loadNodes();
    this.loadDevices();
    this.loadProjects();
  }

  setTab(tab: TabId): void {
    this.activeTab.set(tab);
  }

  setProjectStateFilter(state: string): void {
    this.projectStateFilter.set(state);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  loadNodes(): void {
    this.nodesError.set('');
    this.nodesLoading.set(true);
    this.nodesService.getAll().subscribe({
      next: (data) => {
        this.nodes.set(data);
        this.nodesLoading.set(false);
      },
      error: () => {
        this.nodesError.set('ไม่สามารถโหลดข้อมูล Node ได้');
        this.nodesLoading.set(false);
      },
    });
  }

  loadDevices(): void {
    this.devicesError.set('');
    this.devicesLoading.set(true);
    this.devicesService.getAll().subscribe({
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

  loadProjects(): void {
    this.projectsError.set('');
    this.projectsLoading.set(true);
    this.projectService.getAll().subscribe({
      next: (data) => {
        this.projects.set(data);
        this.projectsLoading.set(false);
      },
      error: () => {
        this.projectsError.set('ไม่สามารถโหลดข้อมูล Project ได้');
        this.projectsLoading.set(false);
      },
    });
  }

}
