// Shared client-side types for the Sprint 4 Smart Compliance Roadmap UI.

export interface RoadmapApiTask {
  id: string;
  phase: number;
  title: string;
  description: string | null;
  regulatoryBasis: string | null;
  templateId: string | null;
  templateRefId: string | null;
  indicatorKey: string | null;
  isLocked: boolean;
  isBlocker: boolean;
  isCustom: boolean;
  status: string;
  ownerUserId: string | null;
  dueDate: string | null;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface RoadmapApiPhaseProgress {
  phase: 1 | 2 | 3 | 4;
  total: number;
  complete: number;
  pct: number;
  isLocked: boolean;
}

export interface RoadmapApiResponse {
  tasks: RoadmapApiTask[];
  grouped: Record<string, RoadmapApiTask[]>;
  phaseProgress: RoadmapApiPhaseProgress[];
  orgId: string | null;
}

export const PHASE_META: Record<
  1 | 2 | 3 | 4,
  { title: string; subtitle: string; color: string; bg: string }
> = {
  1: {
    title: 'Phase 1 — Foundation',
    subtitle: 'Corporate structure & capital',
    color: '#0B6E6E',
    bg: '#E6F4F4',
  },
  2: {
    title: 'Phase 2 — Compliance Infrastructure',
    subtitle: 'AML/CFT, KYC, transaction monitoring',
    color: '#0D2B45',
    bg: '#E8EEF4',
  },
  3: {
    title: 'Phase 3 — ARIP Application',
    subtitle: 'SEC Nigeria registration journey',
    color: '#D4A843',
    bg: '#FDF6E3',
  },
  4: {
    title: 'Phase 4 — AIP Period Operations',
    subtitle: 'AIP restrictions & ongoing reporting',
    color: '#1A7A4A',
    bg: '#F0FAF5',
  },
};

export const P3_01_TEMPLATE_REF_ID = 'P3-01';
