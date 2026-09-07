import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'device-status-sjp:auth-token';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem(TOKEN_KEY);
  return next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request);
};
