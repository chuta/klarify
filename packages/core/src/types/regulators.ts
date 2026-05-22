// Regulator CRM types — CLAUDE.md §13, Sprint 5-C1.
// Shared between the Hono API, Next.js web app, and (future) mobile app.
// Note: InteractionType is defined in domain.ts and re-exported for convenience.
import type { InteractionType } from './domain.js';
export type { InteractionType };

export interface RegulatorAripContacts {
  digital_assets_unit?: string;
  arip_email?: string;
  pre_screening_email?: string;
  innovation_office_hours?: string;
  goaml_portal?: string;
  goaml_note?: string;
  [key: string]: string | undefined;
}

export interface RegulatorAripFees {
  dax_application?: number;
  daop_application?: number;
  dac_application?: number;
  dai_application?: number;
  currency?: string;
  note?: string;
  [key: string]: number | string | undefined;
}

export interface Regulator {
  code: string;
  name: string;
  mandate: string;
  website?: string | null;
  portal?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  jurisdictionTags: string[];
  aripContacts?: RegulatorAripContacts | null;
  aripFees?: RegulatorAripFees | null;
}

export interface RegulatorInteraction {
  id: string;
  orgId: string;
  regulatorCode: string;
  interactionType: InteractionType;
  subject: string;
  outcome?: string | null;
  followUpRequired: boolean;
  followUpDate?: string | null;
  isComplete: boolean;
  createdBy?: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface CreateInteractionBody {
  regulatorCode: string;
  interactionType: InteractionType;
  subject: string;
  outcome?: string;
  followUpRequired?: boolean;
  followUpDate?: string | null;
  occurredAt?: string;
}

export interface UpdateInteractionBody {
  outcome?: string;
  followUpRequired?: boolean;
  followUpDate?: string | null;
  isComplete?: boolean;
  occurredAt?: string;
}
