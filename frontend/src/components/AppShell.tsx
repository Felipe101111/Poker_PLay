import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Navigation } from './Navigation';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const isEntryRoute = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="app-shell">
      {!isEntryRoute && <Navigation />}
      <div className="app-shell__main">{children}</div>
    </div>
  );
}
