import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthUser {
  uuid: string;
  username: string;
  email: string;
  created_at: string;
}

interface LoginResponse {
  message: string;
  user: AuthUser;
  token: string;
}

const STORAGE_KEY = 'device-status-sjp:auth-user';
const TOKEN_KEY = 'device-status-sjp:auth-token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly currentUser = signal<AuthUser | null>(this.readStoredUser());

  get isLoggedIn(): boolean {
    return this.currentUser() !== null && localStorage.getItem(TOKEN_KEY) !== null;
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('http://localhost:3000/auth/login', {
        username,
        password,
      })
      .pipe(
        tap((res) => {
          this.currentUser.set(res.user);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
            localStorage.setItem(TOKEN_KEY, res.token);
          } catch {
            // localStorage may be unavailable (private browsing, etc.) -
            // the in-memory signal still works for this session.
          }
        }),
      );
  }

  logout(): void {
    this.currentUser.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  }

  private readStoredUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}
