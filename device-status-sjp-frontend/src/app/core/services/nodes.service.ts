import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NodeData {
  [key: string]: unknown;
  uuid: string;
  index?: string;
  ref?: string;
  create_time?: string;
  modify_time?: string;
  install_time?: string;
  name?: string;
  coordinates?: string;
  template?: string;
  status?: string;
  projcet?: string;
  province?: string;
  jnumber?: string;
  po?: string;
  note?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NodesService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<NodeData[]> {
    return this.http.get<NodeData[]>(
      'http://localhost:3000/google-sheets/nodes',
    );
  }
}
