import type { Config } from 'tailwindcss';
import { colors } from '@klarify/ui/tokens';

// Bridges CLAUDE.md §7 design tokens into Tailwind so HTML utilities pick up
// brand colours. NativeWind on the web side consumes the same Tailwind config.
const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        klarify: {
          teal: colors.klarifyTeal,
          navy: colors.klarifyNavy,
          gold: colors.klarifyGold,
        },
        bg: {
          primary: colors.bgPrimary,
          teal: colors.bgTeal,
          navy: colors.bgNavy,
          gold: colors.bgGold,
          grey: colors.bgGrey,
        },
        status: {
          critical: colors.statusCritical,
          high: colors.statusHigh,
          good: colors.statusGood,
          ready: colors.statusReady,
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
