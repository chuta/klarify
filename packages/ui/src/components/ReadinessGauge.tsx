// CLAUDE.md §4 — ReadinessGauge: the most important component.
// Uses ONLY React Native primitives — no HTML elements.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, getScoreColor, getScoreLabel } from '../tokens/colors';

export interface ReadinessGaugeProps {
  score: number;       // 0–100
  size?: number;       // default 160
  showLabel?: boolean; // default true
  showScore?: boolean; // default true
}

export function ReadinessGauge({
  score,
  size = 160,
  showLabel = true,
  showScore = true,
}: ReadinessGaugeProps): React.JSX.Element {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const scoreColor = getScoreColor(clampedScore);
  const scoreLabel = getScoreLabel(clampedScore);

  // Circle dimensions
  const borderWidth = 6;
  const innerSize = size - borderWidth * 2;

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    outerRing: {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth,
      borderColor: colors.borderGrey,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.bgPrimary,
    },
    progressRing: {
      position: 'absolute' as const,
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth,
      borderColor: scoreColor,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    inner: {
      width: innerSize,
      height: innerSize,
      borderRadius: innerSize / 2,
      backgroundColor: colors.bgPrimary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    scoreText: {
      fontSize: size * 0.3,
      fontWeight: '700' as const,
      color: scoreColor,
      lineHeight: size * 0.35,
    },
    labelText: {
      fontSize: size * 0.09,
      color: colors.textMuted,
      marginTop: 8,
      textAlign: 'center' as const,
      fontWeight: '500' as const,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.outerRing}>
        <View style={styles.progressRing} />
        <View style={styles.inner}>
          {showScore ? (
            <Text style={styles.scoreText}>{clampedScore}</Text>
          ) : null}
        </View>
      </View>
      {showLabel ? (
        <Text style={styles.labelText}>{scoreLabel}</Text>
      ) : null}
    </View>
  );
}
