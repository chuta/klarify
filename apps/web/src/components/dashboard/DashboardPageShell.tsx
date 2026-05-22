import type { ReactNode } from 'react';

export interface DashboardPageShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * Full-width fluid page container for dashboard routes.
 * Padding lives on the layout `<main>` — pages should not add horizontal padding.
 */
export function DashboardPageShell({
  children,
  className = '',
}: DashboardPageShellProps): JSX.Element {
  return <div className={`w-full min-w-0 ${className}`.trim()}>{children}</div>;
}
