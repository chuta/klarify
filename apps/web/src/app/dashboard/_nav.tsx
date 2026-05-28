import type { ReactNode } from 'react';
import {
  navIcon,
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
} from '@/components/icons';

/**
 * Shared dashboard nav structure.
 *
 * Single source of truth for the desktop sidebar (in layout.tsx) and the
 * mobile drawer (_mobile-nav.tsx). Server-safe — no client-only imports.
 */

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const DASHBOARD_NAV: NavSection[] = [
  {
    title: 'Setup',
    items: [
      { href: '/dashboard/onboarding', label: 'Get Started', icon: navIcon(RocketLaunchIcon) },
    ],
  },
  {
    title: 'ComplianceOS',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: navIcon(HomeIcon) },
      { href: '/dashboard/roadmap', label: 'Roadmap', icon: navIcon(ClipboardDocumentIcon) },
      { href: '/dashboard/documents', label: 'Letter Analyser', icon: navIcon(DocumentTextIcon) },
      { href: '/dashboard/compliance/documents', label: 'Document Generator', icon: navIcon(ClipboardDocumentCheckIcon) },
      { href: '/dashboard/regulators', label: 'Regulators', icon: navIcon(BuildingOffice2Icon) },
      { href: '/dashboard/arip', label: 'ARIP Tracker', icon: navIcon(CheckBadgeIcon) },
      { href: '/dashboard/calendar', label: 'Calendar', icon: navIcon(CalendarDaysIcon) },
    ],
  },
  {
    title: 'FounderCounsel',
    items: [
      { href: '/dashboard/chat', label: 'AI Advisory', icon: navIcon(ChatBubbleLeftRightIcon) },
      { href: '/dashboard/classify', label: 'Classify Product', icon: navIcon(TagIcon) },
      { href: '/dashboard/scenario', label: 'Scenario Simulator', icon: navIcon(Square2StackIcon) },
      { href: '/dashboard/jurisdiction', label: 'Jurisdiction Expansion', icon: navIcon(GlobeAltIcon) },
      { href: '/dashboard/specialists', label: 'Specialists', icon: navIcon(UserGroupIcon) },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/dashboard/team', label: 'Team', icon: navIcon(UsersIcon) },
      { href: '/dashboard/profile', label: 'Profile', icon: navIcon(UserCircleIcon) },
      { href: '/dashboard/billing', label: 'Billing', icon: navIcon(CreditCardIcon) },
      { href: '/dashboard/account/notifications', label: 'Notifications', icon: navIcon(BellIcon) },
    ],
  },
];

const SETUP_SECTION_TITLE = 'Setup';

/**
 * Returns sidebar nav sections for the current user.
 * Hides the Setup / "Get Started" block once onboarding is complete so it
 * does not duplicate the Dashboard link (/dashboard/onboarding redirects there).
 */
export function getDashboardNav(hasCompletedOnboarding: boolean): NavSection[] {
  if (hasCompletedOnboarding) {
    return DASHBOARD_NAV.filter((section) => section.title !== SETUP_SECTION_TITLE);
  }
  return DASHBOARD_NAV;
}
