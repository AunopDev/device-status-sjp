import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DevicesService, DeviceData } from '../../core/services/devices.service';
import { RowGroupDemo } from './row-group-demo';

describe('RowGroupDemo expansion', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RowGroupDemo],
      providers: [provideRouter([]), {
        provide: DevicesService,
        useValue: { getAll: () => of<DeviceData[]>([
          { uuid: 'a', name: 'Device A', project_name: 'Project A', index: 'CCTV', status: 'online' },
          { uuid: 'b', name: 'Device B', project_name: 'Project A', index: 'MikroTik', status: 'online' },
        ]) },
      }],
    });
  });

  it('reopens a collapsed group repeatedly and after collapse all', async () => {
    const fixture = TestBed.createComponent(RowGroupDemo);
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    const groupButton = (): HTMLButtonElement => {
      const button = host.querySelector<HTMLButtonElement>('.root-group button');
      if (!button) throw new Error('Expected a status group button');
      return button;
    };
    expect(groupButton().getAttribute('aria-expanded')).toBe('false');
    fixture.componentInstance.expanded.set(true);
    await fixture.whenStable();
    for (let cycle = 0; cycle < 3; cycle++) {
      groupButton().click();
      await fixture.whenStable();
      expect(groupButton().getAttribute('aria-expanded')).toBe('false');
      expect(host.querySelectorAll('.device-row').length).toBe(0);
      groupButton().click();
      await fixture.whenStable();
      expect(groupButton().getAttribute('aria-expanded')).toBe('true');
      expect(host.querySelectorAll('.device-row').length).toBe(2);
    }
    fixture.componentInstance.expanded.set({});
    await fixture.whenStable();
    groupButton().click();
    await fixture.whenStable();
    expect(groupButton().getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelectorAll('.nested-group .group-toggle').length).toBeGreaterThan(0);
    fixture.componentInstance.expanded.set(true);
    await fixture.whenStable();
    expect(host.querySelectorAll('.device-row').length).toBe(2);
  });

  it('uses the configured hierarchy and exposes its separate filters', async () => {
    const fixture = TestBed.createComponent(RowGroupDemo);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.setFilter('Project A', 'project');
    expect(component.deviceOptions()).toEqual(['CCTV', 'MikroTik']);
    expect(component.hasActiveFilters()).toBe(true);
    expect(component.expanded()).toBe(true);
    expect(component.table.getPreGroupedRowModel().rows).toHaveLength(2);
    const rootGroup = component.table.getGroupedRowModel().rows[0];
    expect(rootGroup?.groupingColumnId).toBe('status');
    component.clearFilters();
    expect(component.hasActiveFilters()).toBe(false);
    expect(component.expanded()).toEqual({});
  });
});
