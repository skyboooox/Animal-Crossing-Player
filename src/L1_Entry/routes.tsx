import type { ReactNode } from 'react';

export type AppRoute = 'home' | 'settings';

export function RouteView({ active, route, children }: { active: AppRoute; route: AppRoute; children: ReactNode }) {
  return active === route ? <>{children}</> : null;
}
