import {
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import type { HeroIcon } from '@/components/icons';

const REGULATOR_ICONS: Record<string, HeroIcon> = {
  SEC_NIGERIA: BuildingLibraryIcon,
  CBN: BuildingLibraryIcon,
  NFIU: MagnifyingGlassIcon,
  NITDA: ComputerDesktopIcon,
  CAC: DocumentTextIcon,
  EFCC: ScaleIcon,
  NAICOM: ShieldCheckIcon,
};

const DEFAULT_ICON: HeroIcon = BuildingOffice2Icon;

export function RegulatorIcon({
  code,
  className = 'h-5 w-5',
}: {
  code: string;
  className?: string;
}): JSX.Element {
  const Icon = REGULATOR_ICONS[code] ?? DEFAULT_ICON;
  return <Icon className={className} aria-hidden />;
}
