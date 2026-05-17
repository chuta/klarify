// ProgressBar — React Native primitives only. CLAUDE.md §4.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, getScoreColor } from '../tokens/colors';

export interface ProgressBarProps {
  value: number;           // 0–100
  color?: string;          // defaults to getScoreColor(value)
  height?: number;         // default 6
  label?: string;          // optional label above bar
  showPercent?: boolean;   // default false
}

export function ProgressBar({
  value,
  color,
  height = 6,
  label,
  showPercent = false,
}: ProgressBarProps): React.JSX.Element {
  const clampedValue = Math.max(0, Math.min(100, Math.round(value)));
  const barColor = color ?? getScoreColor(clampedValue);

  const styles = StyleSheet.create({
    container: {
      width: '100%' as const,
    },
    header: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 4,
    },
    labelText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500' as const,
    },
    percentText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    track: {
      width: '100%' as const,
      height,
      backgroundColor: colors.bgGrey,
      borderRadius: height / 2,
      overflow: 'hidden' as const,
    },
    fill: {
      height,
      backgroundColor: barColor,
      borderRadius: height / 2,
      width: `${clampedValue}%` as `${number}%`,
    },
  });

  return (
    <View style={styles.container}>
      {(label !== undefined || showPercent) ? (
        <View style={styles.header}>
          {label !== undefined ? (
            <Text style={styles.labelText}>{label}</Text>
          ) : null}
          {showPercent ? (
            <Text style={styles.percentText}>{clampedValue}%</Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.track}>
        <View style={styles.fill} />
      </View>
    </View>
  );
}
