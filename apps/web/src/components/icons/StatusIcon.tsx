import type { ReactNode } from 'react';
import {
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  NoSymbolIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

type HeroIcon = typeof ExclamationTriangleIcon;

export type StatusIconVariant =
  | 'warning'
  | 'danger'
  | 'success'
  | 'lock'
  | 'celebration'
  | 'chart'
  | 'calendar'
  | 'clipboard';

const STATUS_ICONS: Record<StatusIconVariant, HeroIcon> = {
  warning: ExclamationTriangleIcon,
  danger: NoSymbolIcon,
  success: CheckCircleIcon,
  lock: LockClosedIcon,
  celebration: SparklesIcon,
  chart: ChartBarIcon,
  calendar: CalendarDaysIcon,
  clipboard: ClipboardDocumentListIcon,
};

export interface StatusLineProps {
  variant: StatusIconVariant;
  children: ReactNode;
  className?: string;
  iconClassName?: string;
}

/** Inline status text with a matching Heroicon — replaces emoji prefixes in alerts. */
export function StatusLine({
  variant,
  children,
  className = '',
  iconClassName = 'h-4 w-4 shrink-0',
}: StatusLineProps): JSX.Element {
  const Icon = STATUS_ICONS[variant];
  return (
    <span className={`inline-flex items-start gap-1.5 ${className}`}>
      <Icon className={`${iconClassName} mt-0.5`} aria-hidden />
      <span>{children}</span>
    </span>
  );
}

export function StatusIcon({
  variant,
  className = 'h-5 w-5',
}: {
  variant: StatusIconVariant;
  className?: string;
}): JSX.Element {
  const Icon = STATUS_ICONS[variant];
  return <Icon className={className} aria-hidden />;
}
