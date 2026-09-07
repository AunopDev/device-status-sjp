import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type DeviceData = Record<string, unknown> & { uuid: string };

@Injectable({
  providedIn: 'root',
})
export class DevicesService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<DeviceData[]> {
    return this.http.get<DeviceData[]>('http://localhost:3000/google-sheets/devices');
  }
}
