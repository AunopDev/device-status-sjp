import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { Dashboard } from './dashboard';
import { DevicesService, DeviceData } from '../../core/services/devices.service';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/services/theme.service';

describe('Dashboard device refresh', () => {
  const getAll = vi.fn(() => of<DeviceData[]>([{ uuid: 'a', status: 'online' }]));

  beforeEach(() => {
    vi.useFakeTimers();
    getAll.mockReset();
    getAll.mockReturnValue(of([{ uuid: 'a', status: 'online' }]));
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: DevicesService, useValue: { getAll } },
        { provide: AuthService, useValue: { currentUser: () => null } },
        { provide: ThemeService, useValue: {} },
        { provide: Router, useValue: {} },
      ],
    }).overrideComponent(Dashboard, { set: { template: '', imports: [] } });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('refreshes every 30 seconds and stops when the dashboard is destroyed', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    expect(getAll).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_000);
    expect(getAll).toHaveBeenCalledTimes(2);
    fixture.destroy();
    vi.advanceTimersByTime(60_000);
    expect(getAll).toHaveBeenCalledTimes(2);
  });

  it('counts statuses within the selected type and keeps filters after data refresh', () => {
    const fixture = TestBed.createComponent(Dashboard);
    const dashboard = fixture.componentInstance;
    dashboard.devices.set([
      { uuid: 'a', index: 'camera', status: 'online' },
      { uuid: 'b', index: 'camera', status: 'offline' },
      { uuid: 'c', index: 'router', status: 'offline' },
    ]);
    dashboard.deviceTypeFilter.set('camera');
    dashboard.deviceStatusFilter.set('offline');
    expect(dashboard.deviceStatusOptions().map((option) => option.count)).toEqual([2, 1, 1, 0]);
    expect(dashboard.filteredDevices().map((device) => device.uuid)).toEqual(['b']);
    dashboard.devices.set([{ uuid: 'a', index: 'camera', status: 'offline' }]);
    expect(dashboard.deviceStatusFilter()).toBe('offline');
    expect(dashboard.deviceTypeFilter()).toBe('camera');
    expect(dashboard.filteredDevices().map((device) => device.uuid)).toEqual(['a']);
    dashboard.clearDeviceFilters();
    expect(dashboard.hasDeviceFilters()).toBe(false);
  });

  it('groups devices by project, then shows only the selected installation point', () => {
    const fixture = TestBed.createComponent(Dashboard);
    const dashboard = fixture.componentInstance;
    dashboard.devices.set([
      { uuid: 'a', project_uuid: 'p1', project_name: 'โครงการ A', node_uuid: 'n1', node_name: 'เสา 1', status: 'online' },
      { uuid: 'b', project_uuid: 'p1', project_name: 'โครงการ A', node_uuid: 'n2', node_name: 'เสา 2', status: 'offline' },
      { uuid: 'c', project_uuid: 'p2', project_name: 'โครงการ B', node_uuid: 'n3', node_name: 'เสา 3', status: 'online' },
    ]);
    expect(dashboard.projects().map((project) => project.name)).toEqual(['โครงการ A', 'โครงการ B']);
    dashboard.selectProject(dashboard.projects()[0]);
    expect(dashboard.nodesInSelectedProject().map((node) => node.name)).toEqual(['เสา 1', 'เสา 2']);
    dashboard.selectNode(dashboard.nodesInSelectedProject()[1]);
    expect(dashboard.filteredDevices().map((device) => device.uuid)).toEqual(['b']);
  });

  it('skips concurrent loads, reports timeout, and recovers at the next tick', () => {
    const pending = new Subject<DeviceData[]>();
    getAll.mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const dashboard = fixture.componentInstance;
    dashboard.loadDevices();
    expect(getAll).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(25_000);
    expect(dashboard.devicesError()).toBe('ไม่สามารถโหลดข้อมูล Device ได้');
    expect(dashboard.devicesLoading()).toBe(false);
    vi.advanceTimersByTime(5_000);
    expect(getAll).toHaveBeenCalledTimes(2);
    expect(dashboard.devicesError()).toBe('');
    expect(dashboard.devices()).toEqual([{ uuid: 'a', status: 'online' }]);
  });
});
