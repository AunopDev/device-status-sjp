import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { SidebarDemo } from './features/sidebar-demo/sidebar-demo';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'group-demo',
    loadComponent: () => import('./features/group-demo/group-demo').then((module) => module.GroupDemo),
    canActivate: [authGuard],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
  },
  {
    path: 'sidebar-demo',
    component: SidebarDemo,
    canActivate: [authGuard],
  },
  // {
  //   path: '**',
  // },
];
