/**
 * Klarify web icon set — [@heroicons/react](https://github.com/tailwindlabs/heroicons)
 *
 * Import from here instead of inlining SVGs so sizing and stroke weight stay
 * consistent across marketing pages, auth, and the dashboard.
 */
import type { ComponentType, SVGProps } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  BellIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  CreditCardIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  HomeIcon,
  InformationCircleIcon,
  LockClosedIcon,
  PlusIcon,
  RocketLaunchIcon,
  Square2StackIcon,
  TagIcon,
  TrashIcon,
  UserCircleIcon,
  UserGroupIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  CheckIcon as CheckIconSolid,
  PaperAirplaneIcon as PaperAirplaneIconSolid,
} from '@heroicons/react/24/solid';

/** Matches `@heroicons/react` outline icon components. */
export type HeroIcon = typeof Bars3Icon;

/** Default Tailwind size tokens used across the web app. */
export const iconSize = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-7 w-7',
} as const;

export type IconSize = keyof typeof iconSize;

type IconProps = SVGProps<SVGSVGElement> & {
  size?: IconSize;
};

function mergeClass(size: IconSize, className?: string): string {
  return className ? `${iconSize[size]} ${className}` : iconSize[size];
}

function createIcon(
  Icon: HeroIcon,
  defaultSize: IconSize = 'sm',
): ComponentType<IconProps> {
  function Wrapped({ size = defaultSize, className, ...props }: IconProps) {
    return <Icon className={mergeClass(size, className)} aria-hidden {...props} />;
  }
  Wrapped.displayName = Icon.displayName ?? Icon.name;
  return Wrapped;
}

/** Fills parent container — for dashboard sidebar nav slots (`h-4 w-4`). */
export function navIcon(Icon: HeroIcon): JSX.Element {
  return <Icon className="h-full w-full" aria-hidden />;
}

// ── Navigation & chrome ───────────────────────────────────────────────────────
export const MenuIcon = createIcon(Bars3Icon, 'md');
export const CloseIcon = createIcon(XMarkIcon, 'md');
export const ChevronLeft = createIcon(ChevronLeftIcon);
export const ChevronRight = createIcon(ChevronRightIcon);
export const ChevronDown = createIcon(ChevronDownIcon);
export const ArrowLeft = createIcon(ArrowLeftIcon);
export const ArrowRight = createIcon(ArrowRightIcon);
export const ExternalLink = createIcon(ArrowTopRightOnSquareIcon);

// ── Actions & status ──────────────────────────────────────────────────────────
export const Check = createIcon(CheckIcon);
export const CheckSolid = createIcon(CheckIconSolid, 'xs');
export const CheckCircle = createIcon(CheckCircleIcon);
export const Plus = createIcon(PlusIcon);
export const Trash = createIcon(TrashIcon);
export const Spinner = createIcon(ArrowPathIcon);
export const Lock = createIcon(LockClosedIcon);
export const Envelope = createIcon(EnvelopeIcon, 'xl');
export const Info = createIcon(InformationCircleIcon);
export const Download = createIcon(ArrowDownTrayIcon);
export const Send = createIcon(PaperAirplaneIconSolid, 'xs');

// ── Auth ──────────────────────────────────────────────────────────────────────
export const Eye = createIcon(EyeIcon);
export const EyeSlash = createIcon(EyeSlashIcon);

// ── Dashboard nav (re-export raw heroicons for custom navIcon() usage) ────────
export { FeatureIconBox } from './FeatureIconBox.js';
export type { FeatureIconTone, FeatureIconBoxProps } from './FeatureIconBox.js';
export { StatusLine, StatusIcon } from './StatusIcon.js';
export type { StatusIconVariant, StatusLineProps } from './StatusIcon.js';
export {
  RocketLaunchIcon,
  HomeIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
  Square2StackIcon,
  GlobeAltIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  CheckBadgeIcon,
  CreditCardIcon,
  BellIcon,
  UsersIcon,
  UserCircleIcon,
  EnvelopeIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIconSolid,
};
