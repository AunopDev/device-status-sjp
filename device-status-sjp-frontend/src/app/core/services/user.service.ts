import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type UserData = Record<string, unknown> & { uuid: string };

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<UserData[]> {
    return this.http.get<UserData[]>('http://localhost:3000/google-sheets/users');
  }
}
