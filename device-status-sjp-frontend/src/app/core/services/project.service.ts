import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ProjectData = Record<string, unknown> & { uuid: string };

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<ProjectData[]> {
    return this.http.get<ProjectData[]>('http://localhost:3000/google-sheets/projects');
  }
}
