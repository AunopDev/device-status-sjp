import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const TOKEN_KEY = 'device-status-sjp:auth-token';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const token = localStorage.getItem(TOKEN_KEY);
  const authenticatedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (token && isUnauthorizedError(error) && !request.url.endsWith('/auth/login')) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('device-status-sjp:auth-user');
        void router.navigate(['/login'], { queryParams: { reason: 'session-ended' }, replaceUrl: true });
      }
      return throwError(() => error);
    }),
  );
};

function isUnauthorizedError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 401;
}
