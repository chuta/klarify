import type { InteractionType } from '@klarify/core';
import {
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  FolderIcon,
  HandRaisedIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import type { HeroIcon } from '@/components/icons';

export const INTERACTION_TYPE_ICONS: Record<InteractionType, HeroIcon> = {
  call: PhoneIcon,
  email: EnvelopeIcon,
  meeting: HandRaisedIcon,
  submission: ClipboardDocumentListIcon,
  letter: DocumentTextIcon,
};

export function InteractionTypeIcon({
  type,
  className = 'h-4 w-4',
}: {
  type: InteractionType | 'all';
  className?: string;
}): JSX.Element {
  const Icon = type === 'all' ? FolderIcon : INTERACTION_TYPE_ICONS[type];
  return <Icon className={className} aria-hidden />;
}
