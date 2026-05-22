// UpgradePrompt — shown inline whenever a user hits a feature gate.
// CLAUDE.md §10: feature gating by plan tier.
// Brand colours: klarifyTeal #0B6E6E, klarifyNavy #0D2B45, klarifyGold #D4A843.
//
// Props:
//   feature     — human-readable name of the gated feature (e.g. "ARIP Tracker")
//   requiredPlan — the minimum plan that unlocks this feature
//   upgradeUrl  — where to send the user to upgrade (e.g. "/dashboard/billing")
//
// This component intentionally uses only React Native primitives (View, Text,
// Pressable) per CLAUDE.md §15 — no HTML elements — so it renders correctly
// on both web (React Native Web) and mobile (Expo).

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from 'react-native';

export interface UpgradePromptProps {
  /** Human-readable feature name shown to the user. */
  feature: string;
  /** The minimum plan that grants access to this feature. */
  requiredPlan: 'navigator' | 'compass' | 'flagship';
  /** Navigation target for the upgrade CTA. */
  upgradeUrl: string;
  /** Optional callback for the "Upgrade now" press event (web can use Link). */
  onUpgradePress?: () => void;
  /** Optional callback for the "See all features" press event. */
  onSeeFeaturesPress?: () => void;
  /** Optional extra container style. */
  style?: ViewStyle;
}

const PLAN_BENEFITS: Record<UpgradePromptProps['requiredPlan'], string[]> = {
  navigator: [
    '50 AI queries per month',
    '5 document analyses',
    '3 compliance document templates',
  ],
  compass: [
    'Unlimited AI queries',
    'ARIP application tracker',
    'Regulator CRM with interaction log',
    'All 13 document templates',
  ],
  flagship: [
    'All 5 African jurisdictions',
    'Unlimited team seats',
    'Priority human escalation',
    'Full compliance export + API access',
  ],
};

const PLAN_DISPLAY: Record<UpgradePromptProps['requiredPlan'], string> = {
  navigator: 'Navigator',
  compass: 'Compass',
  flagship: 'Flagship',
};

export function UpgradePrompt({
  feature,
  requiredPlan,
  upgradeUrl,
  onUpgradePress,
  onSeeFeaturesPress,
  style,
}: UpgradePromptProps): JSX.Element {
  const planLabel = PLAN_DISPLAY[requiredPlan];
  const benefits = PLAN_BENEFITS[requiredPlan];

  return (
    <View style={[styles.container, style]}>
      {/* Lock icon + heading */}
      <View style={styles.header}>
        <View style={styles.lockIcon}>
          <Text style={styles.lockEmoji}>🔒</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.heading}>Available on {planLabel} plan</Text>
          <Text style={styles.subheading}>
            {feature} requires the {planLabel} plan or higher.
          </Text>
        </View>
      </View>

      {/* Benefits list */}
      <View style={styles.benefitsContainer}>
        <Text style={styles.benefitsTitle}>What you get with {planLabel}:</Text>
        {benefits.map((b) => (
          <View key={b} style={styles.benefitRow}>
            <Text style={styles.benefitCheckmark}>✓</Text>
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <View style={styles.actions}>
        <Pressable
          style={styles.upgradeCta}
          onPress={onUpgradePress}
          // For web, the parent can wrap this in a <Link> or use href
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ href: upgradeUrl } as any)}
        >
          <Text style={styles.upgradeCtaText}>Upgrade to {planLabel} →</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryCta}
          onPress={onSeeFeaturesPress}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ href: '/pricing' } as any)}
        >
          <Text style={styles.secondaryCtaText}>See all features</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0B6E6E',
    backgroundColor: '#E6F4F4',
    padding: 20,
    margin: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  lockIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0B6E6E',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lockEmoji: {
    fontSize: 18,
  },
  headerText: {
    flex: 1,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D2B45',
    marginBottom: 2,
  },
  subheading: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 18,
  },
  benefitsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B6E6E',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 5,
  },
  benefitCheckmark: {
    fontSize: 13,
    color: '#0B6E6E',
    fontWeight: '700',
    marginTop: 1,
  },
  benefitText: {
    fontSize: 13,
    color: '#1A1A1A',
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  upgradeCta: {
    backgroundColor: '#0B6E6E',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  upgradeCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryCta: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  secondaryCtaText: {
    fontSize: 13,
    color: '#0B6E6E',
    textDecorationLine: 'underline',
  },
});
