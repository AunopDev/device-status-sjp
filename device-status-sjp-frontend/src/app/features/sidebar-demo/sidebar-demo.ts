import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { DeviceData, DevicesService } from '../../core/services/devices.service';
import { DataTable } from '../../shared/components/data-table/data-table';

const REQUEST_TIMEOUT_MS = 25_000;
const UNKNOWN_PROJECT = 'ไม่ระบุโครงการ';
const UNKNOWN_NODE = 'ไม่ระบุจุดติดตั้ง';
const STATUS_ONLINE = 'online';
const STATUS_OFFLINE = 'offline';
const STATUS_FILTER_ALL = '';
const PROJECT_GROUP_NONE = 'none';

type StatusFilter = typeof STATUS_FILTER_ALL | typeof STATUS_ONLINE | typeof STATUS_OFFLINE;
type ProjectGrouping = typeof PROJECT_GROUP_NONE | 'province' | 'region';

type ProjectItem = {
  key: string;
  name: string;
  nodeCount: number;
  deviceCount: number;
  onlineCount: number;
  offlineCount: number;
  province: string;
  region: string;
};

type ProjectGroup = {
  label: string;
  projects: ProjectItem[];
};

type NodeItem = {
  key: string;
  name: string;
  deviceCount: number;
  onlineCount: number;
  offlineCount: number;
};

type SidebarDemoView = 'projects' | 'nodes' | 'details';

@Component({
  selector: 'app-sidebar-demo',
  standalone: true,
  imports: [CommonModule, DataTable, RouterLink],
  templateUrl: './sidebar-demo.html',
  styleUrl: './sidebar-demo.css',
})
export class SidebarDemo implements OnInit {
  private readonly devicesService = inject(DevicesService);

  readonly devices = signal<DeviceData[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly selectedProjectKey = signal<string | null>(null);
  readonly selectedNodeKey = signal<string | null>(null);
  readonly view = signal<SidebarDemoView>('projects');
  readonly expandedProjectKey = signal<string | null>(null);
  readonly statusFilter = signal<StatusFilter>(STATUS_FILTER_ALL);
  readonly projectGrouping = signal<ProjectGrouping>(PROJECT_GROUP_NONE);

  readonly projects = computed<ProjectItem[]>(() => {
    const groups = new Map<string, ProjectItem>();
    const projectNodes = new Map<string, Set<string>>();
    for (const device of this.devices()) {
      const key = projectKey(device);
      const item = groups.get(key) ?? {
        key,
        name: projectName(device),
        nodeCount: 0,
        deviceCount: 0,
        onlineCount: 0,
        offlineCount: 0,
        province: textValue(device, 'province', 'ไม่ระบุจังหวัด'),
        region: textValue(device, 'region', 'ไม่ระบุภูมิภาค'),
      };
      item.deviceCount += 1;
      if (statusOf(device) === STATUS_ONLINE) item.onlineCount += 1;
      if (statusOf(device) === STATUS_OFFLINE) item.offlineCount += 1;
      groups.set(key, item);
      const nodes = projectNodes.get(key) ?? new Set<string>();
      nodes.add(nodeKey(device));
      projectNodes.set(key, nodes);
    }
    for (const project of groups.values()) {
      project.nodeCount = projectNodes.get(project.key)?.size ?? 0;
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly selectedProject = computed(() =>
    this.projects().find((project) => project.key === this.selectedProjectKey()),
  );

  readonly filteredProjects = computed(() =>
    this.projects().filter((project) => this.matchesStatus(project.onlineCount, project.offlineCount)),
  );

  readonly projectGroups = computed<ProjectGroup[]>(() => {
    const groups = new Map<string, ProjectItem[]>();
    for (const project of this.filteredProjects()) {
      const label =
        this.projectGrouping() === 'province'
          ? project.province
          : this.projectGrouping() === 'region'
            ? project.region
            : 'โครงการทั้งหมด';
      const items = groups.get(label) ?? [];
      items.push(project);
      groups.set(label, items);
    }
    return [...groups.entries()]
      .map(([label, projects]) => ({ label, projects }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  readonly nodes = computed<NodeItem[]>(() => {
    const project = this.selectedProjectKey();
    return project ? this.nodesForProject(project) : [];
  });

  readonly selectedNode = computed(() =>
    this.nodes().find((node) => node.key === this.selectedNodeKey()),
  );

  readonly filteredNodes = computed(() =>
    this.nodes().filter((node) => this.matchesStatus(node.onlineCount, node.offlineCount)),
  );

  readonly selectedDevices = computed(() => {
    const project = this.selectedProjectKey();
    const node = this.selectedNodeKey();
    if (!project || !node) return [];
    return this.devices().filter((device) =>
      projectKey(device) === project &&
      nodeKey(device) === node &&
      (this.statusFilter() === STATUS_FILTER_ALL || statusOf(device) === this.statusFilter()),
    );
  });

  nodesForProject(project: string): NodeItem[] {
    const groups = new Map<string, NodeItem>();
    for (const device of this.devices()) {
      if (projectKey(device) !== project) continue;
      const key = nodeKey(device);
      const item = groups.get(key) ?? {
        key,
        name: nodeName(device),
        deviceCount: 0,
        onlineCount: 0,
        offlineCount: 0,
      };
      item.deviceCount += 1;
      if (statusOf(device) === STATUS_ONLINE) item.onlineCount += 1;
      if (statusOf(device) === STATUS_OFFLINE) item.offlineCount += 1;
      groups.set(key, item);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  ngOnInit(): void {
    this.loadDevices();
  }

  loadDevices(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.devicesService
      .getAll()
      .pipe(timeout(REQUEST_TIMEOUT_MS), finalize(() => this.loading.set(false)))
      .subscribe({
        next: (devices) => {
          this.devices.set(devices);
        },
        error: () => this.errorMessage.set('ไม่สามารถโหลดข้อมูล Device ได้'),
      });
  }

  openProject(project: ProjectItem): void {
    this.selectedProjectKey.set(project.key);
    this.selectedNodeKey.set(null);
    this.view.set('nodes');
  }

  setStatusFilter(value: string): void {
    if (value === STATUS_ONLINE || value === STATUS_OFFLINE) {
      this.statusFilter.set(value);
      return;
    }
    this.statusFilter.set(STATUS_FILTER_ALL);
  }

  setProjectGrouping(value: string): void {
    if (value === 'province' || value === 'region') {
      this.projectGrouping.set(value);
      return;
    }
    this.projectGrouping.set(PROJECT_GROUP_NONE);
  }

  clearFilters(): void {
    this.statusFilter.set(STATUS_FILTER_ALL);
    this.projectGrouping.set(PROJECT_GROUP_NONE);
  }

  toggleProject(project: ProjectItem): void {
    this.expandedProjectKey.update((current) =>
      current === project.key ? null : project.key,
    );
  }

  openNode(project: ProjectItem, node: NodeItem): void {
    this.selectedProjectKey.set(project.key);
    this.selectedNodeKey.set(node.key);
    this.view.set('details');
  }

  backToProjects(): void {
    this.selectedProjectKey.set(null);
    this.selectedNodeKey.set(null);
    this.expandedProjectKey.set(null);
    this.view.set('projects');
  }

  backToNodes(): void {
    this.selectedNodeKey.set(null);
    this.view.set('nodes');
  }

  private matchesStatus(onlineCount: number, offlineCount: number): boolean {
    return (
      this.statusFilter() === STATUS_FILTER_ALL ||
      (this.statusFilter() === STATUS_ONLINE && onlineCount > 0) ||
      (this.statusFilter() === STATUS_OFFLINE && offlineCount > 0)
    );
  }
}

function textValue(device: DeviceData, field: string, fallback: string): string {
  const value = device[field];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function projectKey(device: DeviceData): string {
  return textValue(device, 'project_uuid', textValue(device, 'project_name', UNKNOWN_PROJECT));
}

function projectName(device: DeviceData): string {
  return textValue(device, 'project_name', UNKNOWN_PROJECT);
}

function nodeKey(device: DeviceData): string {
  return textValue(device, 'node_uuid', textValue(device, 'node_name', UNKNOWN_NODE));
}

function nodeName(device: DeviceData): string {
  return textValue(device, 'node_name', UNKNOWN_NODE);
}

function statusOf(device: DeviceData): string {
  return textValue(device, 'status', '').toLowerCase();
}
