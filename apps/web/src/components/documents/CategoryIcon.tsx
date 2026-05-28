import {
  BuildingLibraryIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  IdentificationIcon,
  ScaleIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import type { HeroIcon } from '@/components/icons';
import type { TemplateCategoryKey } from './categories';

const CATEGORY_ICONS: Record<TemplateCategoryKey, HeroIcon> = {
  ALL: Squares2X2Icon,
  AML_CFT: ShieldCheckIcon,
  KYC: IdentificationIcon,
  LICENSING: DocumentCheckIcon,
  ARIP: BuildingLibraryIcon,
  ARIP_FRAMEWORK: ScaleIcon,
  OTHER: DocumentTextIcon,
};

export interface CategoryIconProps {
  category: TemplateCategoryKey;
  className?: string;
}

export function CategoryIcon({ category, className = 'h-5 w-5' }: CategoryIconProps): JSX.Element {
  const Icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.OTHER;
  return <Icon className={className} aria-hidden />;
}
