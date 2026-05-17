// ComplianceCard — React Native primitives only. CLAUDE.md §4.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, getScoreColor } from '../tokens/colors';
import { ProgressBar } from './ProgressBar';
import type { DimensionKey } from '@klarify/core';

export interface ComplianceCardProps {
  dimension: DimensionKey;
  score: number; // 0–100
  indicators: Array<{ key: string; label: string; complete: boolean }>;
  onPress?: () => void;
}

function formatDimensionName(key: DimensionKey): string {
  return key
    .split('_')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function ComplianceCard({
  dimension,
  score,
  indicators,
  onPress,
}: ComplianceCardProps): React.JSX.Element {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const scoreColor = getScoreColor(clampedScore);
  const topIndicators = indicators.slice(0, 3);

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.white,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderGrey,
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 8,
    },
    dimensionName: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.textPrimary,
      flex: 1,
    },
    scoreBadge: {
      backgroundColor: scoreColor,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    scoreText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: '700' as const,
    },
    progressWrapper: {
      marginBottom: 10,
    },
    indicatorsSection: {
      marginTop: 4,
    },
    indicatorRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 4,
    },
    indicatorIcon: {
      fontSize: 12,
      marginRight: 6,
      width: 14,
      textAlign: 'center' as const,
    },
    indicatorLabel: {
      fontSize: 12,
      color: colors.textMuted,
      flex: 1,
    },
    chevron: {
      marginTop: 8,
      alignItems: 'flex-end' as const,
    },
    chevronText: {
      fontSize: 14,
      color: colors.textMuted,
    },
  });

  const content = (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.dimensionName}>{formatDimensionName(dimension)}</Text>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{clampedScore}</Text>
        </View>
      </View>
      <View style={styles.progressWrapper}>
        <ProgressBar value={clampedScore} />
      </View>
      <View style={styles.indicatorsSection}>
        {topIndicators.map((ind) => (
          <View key={ind.key} style={styles.indicatorRow}>
            <Text style={[styles.indicatorIcon, { color: ind.complete ? colors.statusGood : colors.borderGrey }]}>
              {ind.complete ? '✓' : '○'}
            </Text>
            <Text style={styles.indicatorLabel}>{ind.label}</Text>
          </View>
        ))}
      </View>
      {onPress !== undefined ? (
        <View style={styles.chevron}>
          <Text style={styles.chevronText}>›</Text>
        </View>
      ) : null}
    </View>
  );

  if (onPress !== undefined) {
    return (
      <Pressable onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return content;
}
