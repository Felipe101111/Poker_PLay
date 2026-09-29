import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

interface SurfaceProps {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}

export function Surface({ children, className = '', labelledBy }: SurfaceProps) {
  return <section className={`surface ${className}`.trim()} aria-labelledby={labelledBy}>{children}</section>;
}

interface StatusMessageProps {
  children: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'error';
  role?: 'status' | 'alert';
}

export function StatusMessage({ children, tone = 'info', role = tone === 'error' ? 'alert' : 'status' }: StatusMessageProps) {
  return <p className={`status-message status-message--${tone}`} role={role}>{children}</p>;
}

export function ActionGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`action-group ${className}`.trim()}>{children}</div>;
}
