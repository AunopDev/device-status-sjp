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

const PROJECT_ACTIVE_STATE = 'activate';
const PROJECT_STATE_ALL = 'all';

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

  readonly currentUser = this.authService.currentUser;

  activeTab = signal<TabId>('project');

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
    { id: 'ref', accessorKey: 'ref', header: 'Reference' },
    { id: 'province', accessorKey: 'province', header: 'จังหวัด' },
    { id: 'jnumber', accessorKey: 'jnumber', header: 'J-Number' },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'สถานะ',
      cell: (info) => (info.getValue() as string) || 'ไม่ระบุ',
      meta: { badge: true },
    },
  ];

  readonly projectColumns: DataTableColumn<ProjectData>[] = [
    { id: 'uuid', accessorKey: 'uuid', header: 'UUID' },
    {
      id: 'state',
      accessorKey: 'state',
      header: 'สถานะ Project',
      cell: (info) => String(info.getValue() ?? 'ไม่ระบุ'),
      meta: { badge: true },
    },
    { id: 'name', accessorKey: 'name', header: 'ชื่อ Project' },
    { id: 'region', accessorKey: 'region', header: 'Region' },
    { id: 'province', accessorKey: 'province', header: 'จังหวัด' },
  ];

  readonly totalNodes = computed(() => this.nodes().length);
  readonly onlineNodes = computed(
    () =>
      this.nodes().filter((node) => node.status?.toLowerCase() === 'online')
        .length,
  );
  readonly offlineNodes = computed(() => this.totalNodes() - this.onlineNodes());

  readonly totalDevices = computed(() => this.devices().length);
  readonly totalProjects = computed(() => this.projects().length);
  readonly activeProjects = computed(
    () =>
      this.projects().filter(
        (project) =>
          String(project['state'] ?? '').toLowerCase() === PROJECT_ACTIVE_STATE,
      ).length,
  );
  readonly inactiveProjects = computed(
    () => this.totalProjects() - this.activeProjects(),
  );
  readonly projectStateFilter = signal(PROJECT_STATE_ALL);
  readonly projectStates = computed(() => {
    const states = this.projects().map((project) => String(project['state'] ?? 'ไม่ระบุ'));
    return [...new Set(states)].sort((first, second) => first.localeCompare(second));
  });
  readonly projectStatusSummary = computed(() => this.projectStates().map((state) => ({
    state,
    count: this.projects().filter((project) => String(project['state'] ?? 'ไม่ระบุ') === state).length,
  })));
  readonly filteredProjects = computed(() => {
    const selectedState = this.projectStateFilter();
    if (selectedState === PROJECT_STATE_ALL) return this.projects();
    return this.projects().filter(
      (project) => String(project['state'] ?? 'ไม่ระบุ') === selectedState,
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
