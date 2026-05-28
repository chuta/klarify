import type { HeroIcon } from '@/components/icons';

export type FeatureIconTone = 'teal' | 'gold' | 'navy' | 'dark' | 'danger';

const TONE_CLASS: Record<FeatureIconTone, string> = {
  teal: 'bg-[#E6F4F4] text-[#0B6E6E]',
  gold: 'bg-[#FDF6E3] text-[#A87C00]',
  navy: 'bg-[#E8EEF4] text-[#0D2B45]',
  dark: 'bg-white/10 text-[#0B6E6E]',
  danger: 'bg-red-500/10 text-red-400',
};

export interface FeatureIconBoxProps {
  icon: HeroIcon;
  tone?: FeatureIconTone;
  size?: 'md' | 'lg';
  className?: string;
}

/** Rounded icon tile for marketing cards and persona grids. */
export function FeatureIconBox({
  icon: Icon,
  tone = 'teal',
  size = 'md',
  className = '',
}: FeatureIconBoxProps): JSX.Element {
  const boxSize = size === 'lg' ? 'h-12 w-12' : 'h-11 w-11';
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl ${boxSize} ${TONE_CLASS[tone]} ${className}`}
    >
      <Icon className="h-6 w-6" aria-hidden />
    </div>
  );
}
