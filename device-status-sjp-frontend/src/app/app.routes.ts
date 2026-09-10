import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'row-group',
    loadComponent: () => import('./features/row-group/row-group').then((module) => module.RowGroupDemo),
    canActivate: [authGuard],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
  },
  // {
  //   path: '**',
  // },
];
