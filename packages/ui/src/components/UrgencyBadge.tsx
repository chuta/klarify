// UrgencyBadge — React Native primitives only. CLAUDE.md §4.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../tokens/colors';

export interface UrgencyBadgeProps {
  level: 'critical' | 'high' | 'medium' | 'low';
  small?: boolean;
}

const LEVEL_COLORS: Record<UrgencyBadgeProps['level'], string> = {
  critical: colors.statusCritical,
  high: colors.statusHigh,
  medium: colors.klarifyGold,
  low: colors.statusGood,
};

const LEVEL_LABELS: Record<UrgencyBadgeProps['level'], string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

export function UrgencyBadge({
  level,
  small = false,
}: UrgencyBadgeProps): React.JSX.Element {
  const bgColor = LEVEL_COLORS[level];
  const label = LEVEL_LABELS[level];

  const styles = StyleSheet.create({
    badge: {
      backgroundColor: bgColor,
      borderRadius: 999,
      paddingHorizontal: small ? 8 : 12,
      paddingVertical: small ? 2 : 4,
      alignSelf: 'flex-start' as const,
    },
    text: {
      color: colors.white,
      fontSize: small ? 10 : 12,
      fontWeight: '700' as const,
      letterSpacing: 0.5,
    },
  });

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}
