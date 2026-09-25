import { Routes } from '@angular/router';
import { Landing } from './landing';
import { Tool } from './tool';

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  { path: 'tool', component: Tool },
  { path: 'app', redirectTo: 'tool', pathMatch: 'full' },
  { path: 'try', redirectTo: 'tool', pathMatch: 'full' },
  { path: 'roadmap', component: Tool },
  { path: 'history', component: Tool },
  { path: 'settings', component: Tool },
  { path: '**', redirectTo: '' }
];
